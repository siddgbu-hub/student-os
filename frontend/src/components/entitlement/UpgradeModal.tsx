import React from 'react';
import { Button } from '@student-os/ui';
import { PlanDto, EntitlementDto } from '@student-os/shared';
import { EntitlementService } from '../../services/entitlementService.js';
import { Crown, Timer, Check, Lock, X } from 'lucide-react';

const BASE_CARD: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 0.15s ease',
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

  // STATE B: ACTIVE PAID PRO -> Show active state confirmation
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
            borderRadius: 'var(--radius-lg)',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px',
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
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              position: 'absolute',
              right: '16px',
              top: '16px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
            }}
          >
            <Crown size={26} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Student OS Pro
          </h2>
          <div
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--color-success)',
              fontSize: '0.72rem',
              fontWeight: '600',
              letterSpacing: '0.04em',
            }}
          >
            ACTIVE
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-secondary)', maxWidth: '320px', lineHeight: 1.5 }}>
            Your Student OS Pro subscription is active and fully unlocked. Manage your subscription details in your Account page.
          </p>
          <Button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: '600',
              height: '36px',
              padding: '0 20px',
              marginTop: '6px',
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Header copy depending on state
  const badgeText = isExpiredPaid ? 'PRO ACCESS ENDED' : isActuallyExpired ? 'TRIAL PERIOD ENDED' : 'UPGRADE TO PRO';
  const titleText = isExpiredPaid
    ? 'Your Student OS Pro access has ended'
    : isActuallyExpired
    ? 'Your 7-Day Free Trial Has Ended'
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
          borderRadius: 'var(--radius-lg)',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActuallyExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                border: `1px solid ${isActuallyExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 99, 235, 0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isActuallyExpired ? 'var(--color-error)' : 'var(--color-accent)',
                marginBottom: '8px',
              }}
            >
              {isActuallyExpired ? <Lock size={22} /> : <Crown size={22} />}
            </div>
            <div
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: isActuallyExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                color: isActuallyExpired ? 'var(--color-error)' : 'var(--color-accent)',
                fontSize: '0.68rem',
                fontWeight: '600',
                marginBottom: '6px',
                letterSpacing: '0.04em',
              }}
            >
              {badgeText}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {titleText}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)', maxWidth: '360px' }}>
              {subtitleText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              position: 'absolute',
              right: '16px',
              top: '16px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Pricing Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Yearly Plan Card (Featured) */}
          {yearlyPlan && (
            <div
              style={{
                ...BASE_CARD,
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid var(--color-accent)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: '600',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    RECOMMENDED
                  </span>
                  {savingsPercentage > 0 && (
                    <span
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: 'var(--color-success)',
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      SAVE {savingsPercentage}%
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--color-accent)' }}>
                  {yearlyPlan.durationDays || 365} Days
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    {yearlyPlan.name}
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    ₹{yearlyPrice}
                    <span style={{ fontSize: '0.75rem', fontWeight: '400', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
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
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    height: '34px',
                    padding: '0 16px',
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
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {monthlyPlan.name}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  ₹{monthlyPrice}
                  <span style={{ fontSize: '0.75rem', fontWeight: '400', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
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
                  height: '32px',
                  padding: '0 14px',
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
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
            Everything you already use, unlocked for continued access:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} color="var(--color-success)" /> Full Study Timer & Sessions</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} color="var(--color-success)" /> Spaced Repetition Queue</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} color="var(--color-success)" /> Daily & Monthly Planner</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} color="var(--color-success)" /> Productivity Analytics</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} color="var(--color-success)" /> Goals & Exam Countdown</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} color="var(--color-success)" /> Multi-Device Cloud Sync</div>
          </div>
        </div>

        {/* Payment Notice */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            fontSize: '0.7rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Lock size={14} style={{ flexShrink: 0 }} />
          <span>
            Payment is handled securely via WhatsApp & UPI. Tapping <strong>Continue</strong> opens WhatsApp with your prefilled purchase request. Paid access is activated immediately once confirmed.
          </span>
        </div>
      </div>
    </div>
  );
};
