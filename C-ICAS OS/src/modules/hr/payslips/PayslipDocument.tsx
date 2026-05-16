import React from 'react';
import type { PayslipCalc } from './payslipService';

interface Props {
  calc: PayslipCalc;
  companyName: string;
  companyNip?: string;
  companyAddress?: string;
}

function fmt(v: number) {
  return v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PayslipDocument({ calc, companyName, companyNip, companyAddress }: Props) {
  return (
    <div id="payslip-doc" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1a1a1a', maxWidth: '680px', margin: '0 auto', padding: '32px', background: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '2px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>{companyName}</div>
          {companyNip && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>NIP: {companyNip}</div>}
          {companyAddress && <div style={{ fontSize: '10px', color: '#64748b' }}>{companyAddress}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pasek Płacowy</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>{calc.periodLabel}</div>
        </div>
      </div>

      {/* Employee */}
      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Pracownik</div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{calc.employeeName}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{calc.employeeEmail}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Forma zatrudnienia</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{calc.contractType}</div>
          {calc.hoursWorked > 0 && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Godziny: {calc.hoursWorked.toFixed(2)} h</div>}
          {calc.pitZero && <div style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>PIT-0</div>}
          {calc.isStudent && <div style={{ fontSize: '9px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>Student</div>}
        </div>
      </div>

      {/* Salary breakdown */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#1e293b', color: '#fff' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Składnik</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Kwota (PLN)</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>%</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#0f172a' }}>Wynagrodzenie brutto</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '12px', color: '#0f172a' }}>{fmt(calc.grossBase)}</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '10px', color: '#64748b' }}>100%</td>
          </tr>
          {!calc.isB2B && (
            <>
              <tr>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>Ubezpieczenie emerytalne (prac.)</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#ef4444' }}>− {fmt(calc.zusEmerytalna)}</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#94a3b8', fontSize: '9px' }}>9.76%</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>Ubezpieczenie rentowe (prac.)</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#ef4444' }}>− {fmt(calc.zusRentowa)}</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#94a3b8', fontSize: '9px' }}>6.50%</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>Ubezpieczenie zdrowotne</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#ef4444' }}>− {fmt(calc.zdrowotna)}</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#94a3b8', fontSize: '9px' }}>9.00%</td>
              </tr>
              {calc.ppk > 0 && (
                <tr>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>PPK (prac.)</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#ef4444' }}>− {fmt(calc.ppk)}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#94a3b8', fontSize: '9px' }}>1.50%</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                  Zaliczka na podatek PIT
                  {calc.pitZero && <span style={{ marginLeft: '6px', fontSize: '9px', color: '#16a34a' }}>(zwolnienie PIT-0)</span>}
                  {calc.isStudent && <span style={{ marginLeft: '6px', fontSize: '9px', color: '#2563eb' }}>(zwolnienie student)</span>}
                </td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#ef4444' }}>− {fmt(calc.pit)}</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#94a3b8', fontSize: '9px' }}>12%</td>
              </tr>
            </>
          )}
          {calc.isB2B && (
            <tr>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                Faktura B2B {calc.vatRate && calc.vatRate > 0 ? `(VAT ${calc.vatRate}%)` : '(ZW/RC)'}
              </td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#0284c7' }}>{fmt(calc.bruttoVAT ?? calc.grossBase)}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#94a3b8', fontSize: '9px' }}></td>
            </tr>
          )}
          {/* Net */}
          <tr style={{ background: '#ecfdf5', fontWeight: 900 }}>
            <td style={{ padding: '12px 12px', fontSize: '13px', color: '#064e3b', borderTop: '2px solid #059669' }}>Do wypłaty (netto)</td>
            <td style={{ padding: '12px 12px', fontSize: '15px', color: '#059669', textAlign: 'right', borderTop: '2px solid #059669' }}>{fmt(calc.netSalary)} PLN</td>
            <td style={{ borderTop: '2px solid #059669' }}></td>
          </tr>
        </tbody>
      </table>

      {/* Info box */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 16px', fontSize: '9px', color: '#94a3b8', marginBottom: '32px', lineHeight: '1.6' }}>
        Dokument wygenerowany automatycznie przez system C-ICAS OS · {new Date().toLocaleDateString('pl-PL')} · Dotyczy okresu: {calc.periodLabel}
        {!calc.isB2B && ' · Składki ZUS pracodawcy (emerytalna 9.76%, rentowa 6.50%, wypadkowa 1.67%) nie są uwzględnione w niniejszym zestawieniu.'}
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>Podpis pracodawcy / uprawnionej osoby</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>Podpis pracownika / data odbioru</div>
        </div>
      </div>
    </div>
  );
}

export function printPayslip(calc: PayslipCalc, companyName: string, companyNip?: string, companyAddress?: string) {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8"/>
  <title>Pasek płacowy — ${calc.employeeName} — ${calc.periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }
    @media print {
      @page { margin: 15mm; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    #payslip-doc { max-width: 680px; margin: 0 auto; padding: 32px; }
  </style>
</head>
<body>
  <div id="payslip-doc">
    ${buildPayslipHtml(calc, companyName, companyNip, companyAddress)}
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
  w.document.write(html);
  w.document.close();
}

function buildPayslipHtml(calc: PayslipCalc, companyName: string, companyNip?: string, companyAddress?: string): string {
  const f = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = calc.isB2B ? `
    <tr style="background:#eff6ff">
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569">Faktura B2B ${calc.vatRate && calc.vatRate > 0 ? `(VAT ${calc.vatRate}%)` : '(ZW/RC)'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#0284c7">${f(calc.bruttoVAT ?? calc.grossBase)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;font-size:9px"></td>
    </tr>` : `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569">Ubezpieczenie emerytalne (prac.)</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444">− ${f(calc.zusEmerytalna)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;font-size:9px">9.76%</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569">Ubezpieczenie rentowe (prac.)</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444">− ${f(calc.zusRentowa)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;font-size:9px">6.50%</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569">Ubezpieczenie zdrowotne</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444">− ${f(calc.zdrowotna)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;font-size:9px">9.00%</td>
    </tr>
    ${calc.ppk > 0 ? `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569">PPK (prac.)</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444">− ${f(calc.ppk)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;font-size:9px">1.50%</td>
    </tr>` : ''}
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569">Zaliczka na podatek PIT${calc.pitZero ? ' <span style="font-size:9px;color:#16a34a">(PIT-0)</span>' : ''}${calc.isStudent ? ' <span style="font-size:9px;color:#2563eb">(student)</span>' : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ef4444">− ${f(calc.pit)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;font-size:9px">12%</td>
    </tr>`;

  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #1e293b;padding-bottom:16px">
    <div>
      <div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1e293b">${companyName}</div>
      ${companyNip ? `<div style="font-size:10px;color:#64748b;margin-top:2px">NIP: ${companyNip}</div>` : ''}
      ${companyAddress ? `<div style="font-size:10px;color:#64748b">${companyAddress}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;font-weight:900;color:#6366f1;text-transform:uppercase;letter-spacing:0.1em">Pasek Płacowy</div>
      <div style="font-size:12px;font-weight:700;color:#1e293b;margin-top:4px">${calc.periodLabel}</div>
    </div>
  </div>
  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;display:flex;justify-content:space-between">
    <div>
      <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Pracownik</div>
      <div style="font-size:14px;font-weight:900;color:#0f172a">${calc.employeeName}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">${calc.employeeEmail}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Forma zatrudnienia</div>
      <div style="font-size:12px;font-weight:700;color:#1e293b">${calc.contractType}</div>
      ${calc.hoursWorked > 0 ? `<div style="font-size:10px;color:#64748b;margin-top:2px">Godziny: ${calc.hoursWorked.toFixed(2)} h</div>` : ''}
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <thead>
      <tr style="background:#1e293b;color:#fff">
        <th style="padding:8px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.08em">Składnik</th>
        <th style="padding:8px 12px;text-align:right;font-size:9px;text-transform:uppercase;letter-spacing:0.08em">Kwota (PLN)</th>
        <th style="padding:8px 12px;text-align:right;font-size:9px;text-transform:uppercase;letter-spacing:0.08em">%</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f8fafc;font-weight:700">
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a">Wynagrodzenie brutto</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:12px;color:#0f172a">${f(calc.grossBase)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:10px;color:#64748b">100%</td>
      </tr>
      ${rows}
      <tr style="background:#ecfdf5;font-weight:900">
        <td style="padding:12px;font-size:13px;color:#064e3b;border-top:2px solid #059669">Do wypłaty (netto)</td>
        <td style="padding:12px;font-size:15px;color:#059669;text-align:right;border-top:2px solid #059669">${f(calc.netSalary)} PLN</td>
        <td style="border-top:2px solid #059669"></td>
      </tr>
    </tbody>
  </table>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;font-size:9px;color:#94a3b8;margin-bottom:32px;line-height:1.6">
    Wygenerowano automatycznie · C-ICAS OS · ${new Date().toLocaleDateString('pl-PL')} · Okres: ${calc.periodLabel}
  </div>
  <div style="display:flex;justify-content:space-between;gap:40px">
    <div style="flex:1"><div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:9px;color:#94a3b8;text-align:center">Podpis pracodawcy</div></div>
    <div style="flex:1"><div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:9px;color:#94a3b8;text-align:center">Podpis pracownika / data</div></div>
  </div>`;
}
