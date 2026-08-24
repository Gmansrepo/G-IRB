/* ---------------------------------------------------------------
   IRB supervisory formula — CRR Art. 153, 154, 155.

   Numerics verified against Python's statistics.NormalDist:
   max risk-weight error 6.7e-5 percentage points across
   PD in [0.03%, 30%]. See poc/ for the verification harness.
--------------------------------------------------------------- */

/** Standard normal CDF — Abramowitz & Stegun 26.2.17, |err| < 7.5e-8. */
export function cdf(x: number): number {
  const p = 0.2316419;
  const t = 1 / (1 + p * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const y =
    1 -
    d * t *
      (0.319381530 +
        t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? y : 1 - y;
}

/** Inverse standard normal CDF — Acklam's algorithm, |err| < 4e-9. */
export function inv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
             -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
             3.754408661907416];
  const pl = 0.02425;
  let q: number, r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p > 1 - pl) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
         (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

/** Supervisory confidence level. */
export const Q999 = inv(0.999);

/** Exponential weight used by the correlation functions. */
const wf = (pd: number, k: number) => (1 - Math.exp(-k * pd)) / (1 - Math.exp(-k));

/** Corporate/sovereign/institution correlation: 0.24 -> 0.12 as PD rises. */
export const corpR = (pd: number) => {
  const w = wf(pd, 50);
  return 0.12 * w + 0.24 * (1 - w);
};

export interface ExposureClass {
  key: string;
  label: string;
  short: string;
  /** Correlation R; `s` is annual turnover in EUR millions (SME only). */
  R: (pd: number, s?: number) => number;
  /** Retail classes take no maturity adjustment. */
  maturity: boolean;
  /** Whether the firm-size adjustment applies. */
  sizeAdj?: boolean;
  /** Typical LGD, applied when the class is selected. */
  lgd: number;
}

export const CLASSES: Record<string, ExposureClass> = {
  corp: { key:'corp', label:'Corporate, sovereign, institution', short:'Corporate',
          R: (pd) => corpR(pd), maturity:true, lgd:45 },
  sme:  { key:'sme',  label:'Corporate SME', short:'SME',
          R: (pd, s = 25) => corpR(pd) - 0.04 * (1 - (Math.min(50, Math.max(5, s)) - 5) / 45),
          maturity:true, sizeAdj:true, lgd:45 },
  mort: { key:'mort', label:'Retail — residential mortgage', short:'Mortgage',
          R: () => 0.15, maturity:false, lgd:25 },
  qrre: { key:'qrre', label:'Qualifying revolving retail', short:'QRRE',
          R: () => 0.04, maturity:false, lgd:55 },
  oret: { key:'oret', label:'Other retail', short:'Other retail',
          R: (pd) => { const w = wf(pd, 35); return 0.03 * w + 0.16 * (1 - w); },
          maturity:false, lgd:45 },
};

export const CLASS_ORDER = ['corp', 'sme', 'mort', 'qrre', 'oret'] as const;

export interface Result {
  R: number; cond: number; k: number; ma: number; b: number; rw: number;
}

/**
 * Capital requirement K and risk weight RW.
 * @param pd  probability of default, as a fraction
 * @param lgd loss given default, as a fraction
 * @param m   effective maturity in years (ignored for retail)
 * @param s   annual turnover in EUR millions (SME only)
 */
export function calc(pd: number, lgd: number, m: number, key: string, s = 25): Result {
  const C = CLASSES[key];
  const R = C.R(pd, s);
  const cond = cdf(inv(pd) / Math.sqrt(1 - R) + Math.sqrt(R / (1 - R)) * Q999);
  let k = lgd * cond - pd * lgd;
  let ma = 1;
  let b = 0;
  if (C.maturity) {
    b = Math.pow(0.11852 - 0.05478 * Math.log(pd), 2);
    ma = (1 + (m - 2.5) * b) / (1 - 1.5 * b);
    k *= ma;
  }
  k = Math.max(k, 0);
  // RW = 12.5 x K. The Basel II 1.06 scaling factor is not applied.
  return { R, cond, k, ma, b, rw: k * 12.5 };
}
