/**
 * Welcome Screen Component
 * 
 * 初回起動時に表示される全画面ウェルカム画面
 */

interface WelcomeScreenProps {
    onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
    return (
        <div className="welcome-screen">
            <div className="welcome-content">
                <div className="welcome-logo">
                    <img
                        src="/icon.png"
                        alt="Fokus. Editor"
                        className="welcome-icon"
                    />
                </div>

                <h1 className="welcome-title">Fokus. Editor</h1>

                <p className="welcome-subtitle">
                    書くことに集中するための、<br />
                    ミニマルで美しいMDXエディタ
                </p>

                <div className="welcome-features">
                    <div className="welcome-feature">
                        <span className="feature-icon">✍️</span>
                        <span>直感的なMDX編集</span>
                    </div>
                    <div className="welcome-feature">
                        <span className="feature-icon">🔄</span>
                        <span>Git連携でシームレスな公開</span>
                    </div>
                    <div className="welcome-feature">
                        <span className="feature-icon">🌙</span>
                        <span>ダーク/ライトモード対応</span>
                    </div>
                </div>

                <button className="welcome-start-btn" onClick={onStart}>
                    始める
                </button>

                <p className="welcome-hint">
                    まずはリポジトリの設定から始めましょう
                </p>
            </div>
        </div>
    );
}

export default WelcomeScreen;
