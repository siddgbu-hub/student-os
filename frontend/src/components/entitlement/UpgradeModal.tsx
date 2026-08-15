import React from 'react';
import { Button } from '@student-os/ui';
import { PlanDto, EntitlementDto } from '@student-os/shared';
import { EntitlementService } from '../../services/entitlementService.js';

const BASE_CARD: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
};

export interface UpgradeModalProps {
  isOpen: boolean;
  plans: PlanDto[];
  contactWhatsApp?: string | null;
  accountEmail: string;
  entitlement?: EntitlementDto | null;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  plans,
  contactWhatsApp,
  accountEmail,
  entitlement,
  onClose,
}) => {
  if (!isOpen) return null;

  const isActuallyExpired = entitlement?.status === 'expired';
  const isActivePaid = entitlement?.isPaid === true && entitlement?.status === 'active';
  const isExpiredPaid = isActuallyExpired && (entitlement?.isPaid === true || entitlement?.currentPlanId === 'monthly' || entitlement?.currentPlanId === 'yearly');

  // STATE B: ACTIVE PAID PRO -> Show active state confirmation, never expired
  if (isActivePaid) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl, 20px)',
            maxWidth: '460px',
            width: '100%',
            padding: '28px 24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '14px',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              position: 'absolute',
              right: '20px',
              top: '20px',
            }}
          >
            ✕
          </button>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1.5px solid rgba(245, 158, 11, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}
          >
            ⭐
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
            Student OS Pro
          </h2>
          <div
            style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: '800',
              letterSpacing: '0.04em',
            }}
          >
            ACTIVE
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '340px', lineHeight: 1.5 }}>
            Your Student OS Pro subscription is active and fully unlocked. Manage your subscription details in your Account page.
          </p>
          <Button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: '700',
              height: '38px',
              padding: '0 24px',
              marginTop: '8px',
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Header copy depending on state (STATE C, D, or A)
  const badgeText = isExpiredPaid ? 'PRO ACCESS ENDED' : isActuallyExpired ? 'TRIAL PERIOD ENDED' : 'UPGRADE TO PRO';
  const titleText = isExpiredPaid
    ? 'Your Student OS Pro access has ended.'
    : isActuallyExpired
    ? 'Your 7-Day Trial Has Ended'
    : 'Upgrade to Student OS Pro';
  const subtitleText = isExpiredPaid
    ? 'Your study data is safely preserved. Renew to continue full access.'
    : 'Your study goals, notes, and progress are 100% safely preserved.';

  const paidPlans = plans.filter((p) => p.isActive && p.planId !== 'free_trial' && p.planId !== 'free');
  const monthlyPlan = paidPlans.find((p) => p.planId === 'monthly');
  const yearlyPlan = paidPlans.find((p) => p.planId === 'yearly');

  const monthlyPrice = monthlyPlan ? monthlyPlan.priceCents / 100 : 0;
  const yearlyPrice = yearlyPlan ? yearlyPlan.priceCents / 100 : 0;
  const monthlyAnnualCost = monthlyPrice * 12;
  const savings = monthlyAnnualCost - yearlyPrice;
  const savingsPercentage = monthlyAnnualCost > 0 && savings > 0 ? Math.round((savings / monthlyAnnualCost) * 100) : 0;
  const effectiveMonthly = yearlyPrice > 0 ? Math.round(yearlyPrice / 12) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl, 20px)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                marginBottom: '10px',
              }}
            >
              ⏳
            </div>
            <div
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                fontSize: '0.72rem',
                fontWeight: '700',
                marginBottom: '8px',
              }}
            >
              {badgeText}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
              {titleText}
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)', maxWidth: '380px' }}>
              {subtitleText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              position: 'absolute',
              right: '20px',
              top: '20px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Pricing Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Yearly Plan Card (Featured) */}
          {yearlyPlan && (
            <div
              style={{
                ...BASE_CARD,
                padding: '16px 18px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1.5px solid var(--color-accent)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    RECOMMENDED
                  </span>
                  {savingsPercentage > 0 && (
                    <span
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#10b981',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      SAVE {savingsPercentage}%
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-accent)' }}>
                  {yearlyPlan.durationDays || 365} Days
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {yearlyPlan.name}
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    ₹{yearlyPrice}
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
                      / year
                    </span>
                    {effectiveMonthly > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-accent)', marginLeft: '8px', fontWeight: '600' }}>
                        (₹{effectiveMonthly}/mo)
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    EntitlementService.openWhatsAppPurchase(
                      contactWhatsApp,
                      yearlyPlan.name,
                      yearlyPrice,
                      accountEmail,
                      yearlyPlan.planId,
                      yearlyPlan.durationDays
                    );
                  }}
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    height: '36px',
                    padding: '0 18px',
                  }}
                >
                  Continue with Yearly
                </Button>
              </div>
            </div>
          )}

          {/* Monthly Plan Card */}
          {monthlyPlan && (
            <div
              style={{
                ...BASE_CARD,
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                  {monthlyPlan.name}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  ₹{monthlyPrice}
                  <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
                    / month
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  EntitlementService.openWhatsAppPurchase(
                    contactWhatsApp,
                    monthlyPlan.name,
                    monthlyPrice,
                    accountEmail,
                    monthlyPlan.planId,
                    monthlyPlan.durationDays
                  );
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  height: '34px',
                  padding: '0 16px',
                }}
              >
                Continue with Monthly
              </Button>
            </div>
          )}
        </div>

        {/* Feature List */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Everything you already use, unlocked for continued access:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            <div>✓ Full Study Timer & Sessions</div>
            <div>✓ Spaced Repetition Queue</div>
            <div>✓ Daily & Monthly Planner</div>
            <div>✓ Productivity Analytics</div>
            <div>✓ Goals & Exam Countdown</div>
            <div>✓ Multi-Device Cloud Sync</div>
          </div>
        </div>

        {/* Payment Notice */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(37, 99, 235, 0.04)',
            border: '1px solid var(--color-border)',
            fontSize: '0.7rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4,
          }}
        >
          🔒 Payment is currently handled manually via WhatsApp & UPI. Tapping <strong>Continue</strong> opens WhatsApp with a prefilled purchase request to the Owner. Once payment is confirmed, paid access is activated immediately.
        </div>
      </div>
    </div>
  );
};
