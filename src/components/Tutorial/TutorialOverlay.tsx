import { useState, useEffect } from 'react';

export interface TutorialStep {
    target: string | null;  // CSS selector, null for center modal
    title: string;
    description: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
    isActive: boolean;
    steps: TutorialStep[];
    onComplete: () => void;
    onSkip: () => void;
}

export function TutorialOverlay({ isActive, steps, onComplete, onSkip }: TutorialOverlayProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const currentStep = steps[currentStepIndex];

    // チュートリアル開始時にステップをリセット
    useEffect(() => {
        if (isActive) {
            setCurrentStepIndex(0);
        }
    }, [isActive]);

    useEffect(() => {
        if (!isActive) return;

        const updateTarget = () => {
            if (currentStep.target) {
                const element = document.querySelector(currentStep.target);
                if (element) {
                    setTargetRect(element.getBoundingClientRect());
                } else {
                    // Fallback if element not found (e.g. sidebar closed)
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
        };

        // Update immediately
        updateTarget();

        // Update on resize
        window.addEventListener('resize', updateTarget);

        // Short delay to allow for UI transitions (e.g. sidebar opening)
        const timeout = setTimeout(updateTarget, 300);

        return () => {
            window.removeEventListener('resize', updateTarget);
            clearTimeout(timeout);
        };
    }, [isActive, currentStepIndex, currentStep?.target]);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    if (!isActive) return null;

    // Calculate spotlight hole path
    // Using simple box-shadow or massive border technique is easier than SVG clip-path for rectangles
    // We'll use the box-shadow approach: a huge shadow around the target box

    // Fallback centered style for steps without target

    const spotlightStyle: React.CSSProperties = targetRect ? {
        position: 'absolute',
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
        borderRadius: '4px',
        transition: 'all 0.3s ease-out',
        pointerEvents: 'none', // Allow clicks pass through? No, we want to block interactions mostly
        zIndex: 1000
    } : {
        // Full screen cover if no target
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1000,
        transition: 'all 0.3s ease-out',
    };

    // Tooltip positioning logic
    const tooltipStyle: React.CSSProperties = {
        position: targetRect ? 'absolute' : 'fixed',
        zIndex: 1001,
        maxWidth: '400px', // 幅制限を設ける
    };

    if (targetRect) {
        let top = targetRect.bottom + 16;
        let left = targetRect.left;
        let transform = '';

        // Position hint priority
        let pos = currentStep.position;

        // Auto-detect good position if not specified
        if (!pos) {
            // If target is very tall (like sidebar), prefer right side
            if (targetRect.height > 300 && targetRect.left < 100) {
                pos = 'right';
            }
        }

        if (pos === 'right') {
            top = targetRect.top + 20;
            left = targetRect.right + 16;
            // No transform needed generally, maybe center vertically if needed but consistent top alignment is safer
        } else if (pos === 'left') {
            top = targetRect.top + 20;
            left = targetRect.left - 16;
            transform = 'translateX(-100%)';
        } else if (pos === 'top') {
            top = targetRect.top - 16;
            transform = 'translateY(-100%)';
        } else {
            // Default 'bottom' logic with fallback

            // --- Vertical Adjustment ---
            // If target is too low (bottom 200px), show above
            // BUT avoid showing above if it would go off-screen (top < 0)
            if (top + 200 > window.innerHeight) {
                const topCandidate = targetRect.top - 16;
                // Only flip to top if there is enough space above
                if (topCandidate > 100) {
                    top = topCandidate;
                    transform = 'translateY(-100%)';
                }
                // If not enough space above AND below, maybe forces right/left? 
                // For now, let it be below (scrolling might be needed but overlay is fixed)
                // Or clamp to window bottom
            }
        }

        // --- Horizontal Adjustment for all cases ---
        const estimatedWidth = 320; // 推定幅

        // 右端チェック
        if (left + estimatedWidth > window.innerWidth) {
            if (pos === 'right') {
                // If explicitly requested right but no space, maybe flip left?
                left = targetRect.left - 16;
                transform = 'translateX(-100%)';
            } else {
                // Just shift text box
                left = window.innerWidth - estimatedWidth - 20;
            }
        }

        // 左端チェック
        if (left < 20) {
            if (pos === 'left') {
                // No space on left, flip right
                left = targetRect.right + 16;
                transform = '';
            } else {
                left = 20;
            }
        }

        tooltipStyle.top = top;
        tooltipStyle.left = left;
        if (transform) tooltipStyle.transform = transform;

    } else {
        // Centered
        tooltipStyle.top = '50%';
        tooltipStyle.left = '50%';
        tooltipStyle.transform = 'translate(-50%, -50%)';
        tooltipStyle.width = '90%';
        tooltipStyle.maxWidth = '500px';
    }

    return (
        <div className="tutorial-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
            {/* The Spotlight/Background Layer */}
            <div style={spotlightStyle}></div>

            {/* The Content Layer */}
            <div className="tutorial-tooltip-container" style={tooltipStyle}>
                <div className="tutorial-card">
                    <div className="tutorial-header">
                        <h3>{currentStep.title}</h3>
                        <div className="step-counter">
                            {currentStepIndex + 1} / {steps.length}
                        </div>
                    </div>

                    <div className="tutorial-body">
                        {currentStep.description}
                    </div>

                    <div className="tutorial-footer">
                        <button
                            className="secondary"
                            onClick={onSkip}
                            style={{ marginRight: 'auto' }}
                        >
                            スキップ
                        </button>

                        {currentStepIndex > 0 && (
                            <button className="secondary" onClick={handlePrev}>
                                戻る
                            </button>
                        )}

                        <button className="primary" onClick={handleNext}>
                            {currentStepIndex === steps.length - 1 ? '完了' : '次へ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
