use regex::Regex;
use reqwest::blocking::{Client, Response};
use reqwest::header::{ACCEPT, CONTENT_LENGTH, CONTENT_TYPE, LOCATION};
use reqwest::{redirect::Policy, Url};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::net::{IpAddr, SocketAddr, ToSocketAddrs};
use std::sync::OnceLock;
use std::time::Duration;

const MAX_REDIRECTS: usize = 5;
const MAX_HTML_BYTES: u64 = 1_048_576;
const REQUEST_TIMEOUT_SECONDS: u64 = 5;

#[derive(Debug, Deserialize)]
pub struct LinkPreviewRequest {
    pub url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkPreviewMetadata {
    pub url: String,
    pub title: String,
    pub hostname: String,
    pub description: Option<String>,
    pub favicon_url: String,
}

#[tauri::command(async)]
pub async fn fetch_link_preview(
    request: LinkPreviewRequest,
) -> Result<LinkPreviewMetadata, String> {
    tauri::async_runtime::spawn_blocking(move || fetch_link_preview_blocking(&request.url))
        .await
        .map_err(|error| format!("リンク情報の取得処理に失敗しました: {error}"))?
}

fn fetch_link_preview_blocking(url: &str) -> Result<LinkPreviewMetadata, String> {
    let initial_url = validate_url(url)?;
    let original_url = initial_url.to_string();
    let (final_url, html) = fetch_html(initial_url)?;
    let mut metadata = parse_metadata(&final_url, &html);
    metadata.url = original_url;
    Ok(metadata)
}

fn validate_url(value: &str) -> Result<Url, String> {
    let mut url = Url::parse(value).map_err(|_| "有効なURLではありません".to_string())?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err("httpまたはhttpsのURLのみプレビューできます".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("認証情報を含むURLはプレビューできません".to_string());
    }
    if let Some(port) = url.port() {
        let standard_port = if url.scheme() == "https" { 443 } else { 80 };
        if port != standard_port {
            return Err("標準ポート以外のURLはプレビューできません".to_string());
        }
    }

    let hostname = url
        .host_str()
        .ok_or_else(|| "ホスト名のないURLはプレビューできません".to_string())?;
    let normalized_hostname = hostname.trim_end_matches('.').to_ascii_lowercase();
    if normalized_hostname == "localhost"
        || normalized_hostname.ends_with(".localhost")
        || normalized_hostname.ends_with(".local")
        || normalized_hostname.ends_with(".internal")
    {
        return Err("ローカルネットワークのURLはプレビューできません".to_string());
    }

    url.set_fragment(None);
    Ok(url)
}

fn resolve_public_addresses(url: &Url) -> Result<(String, Vec<SocketAddr>), String> {
    let hostname = url
        .host_str()
        .ok_or_else(|| "ホスト名を取得できませんでした".to_string())?
        .to_string();
    let port = url
        .port_or_known_default()
        .ok_or_else(|| "接続先ポートを判定できませんでした".to_string())?;
    let addresses: Vec<SocketAddr> = (hostname.as_str(), port)
        .to_socket_addrs()
        .map_err(|_| "ホスト名を解決できませんでした".to_string())?
        .collect();

    if addresses.is_empty() {
        return Err("接続先が見つかりませんでした".to_string());
    }
    if addresses.iter().any(|address| !is_public_ip(address.ip())) {
        return Err("ローカルネットワークのURLはプレビューできません".to_string());
    }

    Ok((hostname, addresses))
}

fn is_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => {
            let octets = ip.octets();
            !(ip.is_private()
                || ip.is_loopback()
                || ip.is_link_local()
                || ip.is_broadcast()
                || ip.is_documentation()
                || ip.is_unspecified()
                || ip.is_multicast()
                || octets[0] == 0
                || (octets[0] == 100 && (64..=127).contains(&octets[1]))
                || (octets[0] == 192 && octets[1] == 0 && octets[2] == 0)
                || (octets[0] == 198 && (octets[1] == 18 || octets[1] == 19)))
        }
        IpAddr::V6(ip) => {
            !(ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_unique_local()
                || ip.is_unicast_link_local()
                || ip.is_multicast())
        }
    }
}

fn build_client(hostname: &str, addresses: &[SocketAddr]) -> Result<Client, String> {
    Client::builder()
        .redirect(Policy::none())
        .connect_timeout(Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
        .user_agent("Fokus-Editor/0.1 (+https://shek-fokus.com)")
        .resolve_to_addrs(hostname, addresses)
        .build()
        .map_err(|error| format!("HTTPクライアントを作成できませんでした: {error}"))
}

fn fetch_html(mut url: Url) -> Result<(Url, String), String> {
    for redirect_count in 0..=MAX_REDIRECTS {
        let (hostname, addresses) = resolve_public_addresses(&url)?;
        let client = build_client(&hostname, &addresses)?;
        let response = client
            .get(url.clone())
            .header(ACCEPT, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1")
            .send()
            .map_err(|error| format!("ページを取得できませんでした: {error}"))?;

        if response.status().is_redirection() {
            if redirect_count == MAX_REDIRECTS {
                return Err("リダイレクト回数が上限を超えました".to_string());
            }
            let location = response
                .headers()
                .get(LOCATION)
                .ok_or_else(|| "リダイレクト先がありません".to_string())?
                .to_str()
                .map_err(|_| "リダイレクト先を読み取れませんでした".to_string())?;
            url = validate_url(
                url.join(location)
                    .map_err(|_| "リダイレクト先が不正です".to_string())?
                    .as_str(),
            )?;
            continue;
        }

        if !response.status().is_success() {
            return Err(format!(
                "ページの取得に失敗しました ({})",
                response.status()
            ));
        }

        return read_html_response(url, response);
    }

    Err("ページを取得できませんでした".to_string())
}

fn read_html_response(url: Url, response: Response) -> Result<(Url, String), String> {
    if let Some(content_type) = response.headers().get(CONTENT_TYPE) {
        let content_type = content_type
            .to_str()
            .unwrap_or_default()
            .to_ascii_lowercase();
        if !content_type.contains("text/html") && !content_type.contains("application/xhtml+xml") {
            return Err("HTMLページではないためプレビューできません".to_string());
        }
    }

    if let Some(content_length) = response
        .headers()
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
    {
        if content_length > MAX_HTML_BYTES {
            return Err("ページサイズが大きすぎます".to_string());
        }
    }

    let mut bytes = Vec::new();
    response
        .take(MAX_HTML_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| format!("ページを読み取れませんでした: {error}"))?;
    if bytes.len() as u64 > MAX_HTML_BYTES {
        return Err("ページサイズが大きすぎます".to_string());
    }

    Ok((url, String::from_utf8_lossy(&bytes).into_owned()))
}

fn tag_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"(?is)<(?:meta|link)\b[^>]*>").expect("valid tag regex"))
}

fn attribute_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(r#"(?is)([a-z_:][-a-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))"#)
            .expect("valid attribute regex")
    })
}

fn title_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX
        .get_or_init(|| Regex::new(r"(?is)<title\b[^>]*>(.*?)</title>").expect("valid title regex"))
}

fn html_tag_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"(?is)<[^>]+>").expect("valid html tag regex"))
}

fn entity_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(r"&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);?")
            .expect("valid entity regex")
    })
}

fn parse_attributes(tag: &str) -> HashMap<String, String> {
    attribute_regex()
        .captures_iter(tag)
        .filter_map(|captures| {
            let name = captures.get(1)?.as_str().to_ascii_lowercase();
            let value = captures
                .get(2)
                .or_else(|| captures.get(3))
                .or_else(|| captures.get(4))?
                .as_str()
                .to_string();
            Some((name, value))
        })
        .collect()
}

fn decode_html_entities(value: &str) -> String {
    entity_regex()
        .replace_all(value, |captures: &regex::Captures<'_>| {
            let entity = captures
                .get(1)
                .map(|value| value.as_str())
                .unwrap_or_default();
            match entity.to_ascii_lowercase().as_str() {
                "amp" => "&".to_string(),
                "lt" => "<".to_string(),
                "gt" => ">".to_string(),
                "quot" => "\"".to_string(),
                "apos" => "'".to_string(),
                "nbsp" => " ".to_string(),
                value if value.starts_with("#x") => u32::from_str_radix(&value[2..], 16)
                    .ok()
                    .and_then(char::from_u32)
                    .map(|character| character.to_string())
                    .unwrap_or_else(|| captures[0].to_string()),
                value if value.starts_with('#') => value[1..]
                    .parse::<u32>()
                    .ok()
                    .and_then(char::from_u32)
                    .map(|character| character.to_string())
                    .unwrap_or_else(|| captures[0].to_string()),
                _ => captures[0].to_string(),
            }
        })
        .into_owned()
}

fn clean_text(value: &str, max_chars: usize) -> String {
    let without_tags = html_tag_regex().replace_all(value, " ");
    let decoded = decode_html_entities(&without_tags);
    decoded
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(max_chars)
        .collect()
}

fn parse_metadata(url: &Url, html: &str) -> LinkPreviewMetadata {
    let hostname = url.host_str().unwrap_or_default().to_string();
    let mut metadata = HashMap::<String, String>::new();
    let mut favicon_url = None;

    for tag_match in tag_regex().find_iter(html) {
        let tag = tag_match.as_str();
        let attributes = parse_attributes(tag);

        if tag.to_ascii_lowercase().starts_with("<meta") {
            let key = attributes
                .get("property")
                .or_else(|| attributes.get("name"))
                .map(|value| value.to_ascii_lowercase());
            if let (Some(key), Some(content)) = (key, attributes.get("content")) {
                metadata.entry(key).or_insert_with(|| content.clone());
            }
        } else if favicon_url.is_none() {
            let is_icon = attributes.get("rel").is_some_and(|rel| {
                rel.split_whitespace()
                    .any(|value| value.to_ascii_lowercase().ends_with("icon"))
            });
            if is_icon {
                favicon_url = attributes
                    .get("href")
                    .and_then(|href| url.join(href).ok())
                    .filter(|favicon| matches!(favicon.scheme(), "http" | "https"))
                    .map(|favicon| favicon.to_string());
            }
        }
    }

    let document_title = title_regex()
        .captures(html)
        .and_then(|captures| captures.get(1))
        .map(|value| value.as_str());
    let title = metadata
        .get("og:title")
        .or_else(|| metadata.get("twitter:title"))
        .map(String::as_str)
        .or(document_title)
        .map(|value| clean_text(value, 160))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| hostname.clone());
    let description = metadata
        .get("og:description")
        .or_else(|| metadata.get("twitter:description"))
        .or_else(|| metadata.get("description"))
        .map(|value| clean_text(value, 240))
        .filter(|value| !value.is_empty());
    let favicon_url = favicon_url
        .unwrap_or_else(|| format!("https://www.google.com/s2/favicons?domain={hostname}"));

    LinkPreviewMetadata {
        url: url.to_string(),
        title,
        hostname,
        description,
        favicon_url,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_open_graph_metadata_and_relative_favicon() {
        let url = Url::parse("https://example.com/articles/one").unwrap();
        let html = r#"
            <html><head>
              <title>Fallback title</title>
              <meta property="og:title" content="Fokus &amp; Test">
              <meta name='description' content='A useful description'>
              <link rel="shortcut icon" href="/favicon.png">
            </head></html>
        "#;

        let metadata = parse_metadata(&url, html);
        assert_eq!(metadata.title, "Fokus & Test");
        assert_eq!(
            metadata.description.as_deref(),
            Some("A useful description")
        );
        assert_eq!(metadata.favicon_url, "https://example.com/favicon.png");
    }

    #[test]
    fn rejects_local_and_private_urls() {
        assert!(validate_url("http://localhost/page").is_err());
        assert!(validate_url("https://example.com:8443/page").is_err());
        assert!(!is_public_ip("127.0.0.1".parse().unwrap()));
        assert!(!is_public_ip("192.168.1.1".parse().unwrap()));
        assert!(is_public_ip("1.1.1.1".parse().unwrap()));
    }
}
