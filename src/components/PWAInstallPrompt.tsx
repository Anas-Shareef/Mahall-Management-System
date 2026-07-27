import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

export const PWAInstallPrompt: React.FC = () => {
  const { branding, getInitials } = useOrganization();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone PWA
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIPhoneOrIPad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIPhoneOrIPad);

    // Listen to Android / Desktop PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not dismissed, show prompt
    if (isIPhoneOrIPad && !localStorage.getItem('pwa_prompt_dismissed')) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* FLOATING PWA INSTALL BANNER */}
      <div className="pwa-install-banner animate-bounce-in">
        <div className="flex-row-gap-md align-items-center">
          <div className="pwa-icon-badge shadow-sm">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.organizationName} />
            ) : (
              <span>{getInitials(branding.organizationName)}</span>
            )}
          </div>
          <div>
            <h4 className="font-xs font-weight-800 text-dark margin-0">Install {branding.shortName || 'Mahallu Portal'}</h4>
            <p className="font-2xs color-subtle margin-top-3xs">Add app to home screen for fast fullscreen access</p>
          </div>
        </div>

        <div className="flex-row-gap-xs align-items-center">
          <button type="button" className="pill-btn-primary font-2xs flex-row-gap-3xs" onClick={handleInstallClick}>
            <Download size={13} /> Install App
          </button>
          <button type="button" className="pwa-dismiss-btn" onClick={handleDismiss} title="Dismiss">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* IOS SAFARI ADD TO HOME SCREEN MODAL */}
      {showIOSModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowIOSModal(false)}>
          <div className="modal-size-sm side-panel-shell padding-lg animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between align-items-center margin-bottom-md">
              <div className="flex-row-gap-xs align-items-center">
                <Smartphone size={20} className="text-emerald" />
                <h3 className="font-md font-weight-800 text-dark margin-0">Install on iPhone / iPad</h3>
              </div>
              <button className="pwa-dismiss-btn" onClick={() => setShowIOSModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p className="font-xs color-subtle margin-bottom-md">
              To install <strong>{branding.organizationName}</strong> to your home screen:
            </p>

            <div className="ios-instructions-list flex-col gap-sm">
              <div className="ios-step-item">
                <div className="step-num">1</div>
                <div className="font-xs text-dark">
                  Tap the <Share size={15} className="text-emerald display-inline-icon" /> <strong>Share</strong> button at the bottom of Safari.
                </div>
              </div>

              <div className="ios-step-item">
                <div className="step-num">2</div>
                <div className="font-xs text-dark">
                  Scroll down and tap <PlusSquare size={15} className="text-emerald display-inline-icon" /> <strong>Add to Home Screen</strong>.
                </div>
              </div>

              <div className="ios-step-item">
                <div className="step-num">3</div>
                <div className="font-xs text-dark">
                  Tap <strong>Add</strong> in the top right corner.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="pill-btn-primary full-width margin-top-md font-xs"
              onClick={() => {
                setShowIOSModal(false);
                handleDismiss();
              }}
            >
              <CheckCircle size={15} /> Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
