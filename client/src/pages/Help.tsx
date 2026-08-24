import React from "react";
import { BookOpenCheck, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { startLogin } from "@/const";
import { Link } from "wouter";

export default function Help() {
  const { loading, isAuthenticated } = useAuth();
  const { language, setLanguage } = useLanguage();
  const ar = language === "ar";
  const c = ar ? {
    loading: "جارٍ تحميل مساعدة FFM…", eyebrow: "FFM / دليل الاستخدام", title: "المساعدة والخصوصية", subtitle: "دليل تشغيلي مختصر وآمن للمديرين والمندوبين وأبطال المستودع.", print: "طباعة الدليل العربي", printHint: "نسخة مناسبة للطباعة للمستخدمين الجدد", start: "البدء", startText: "افتح لوحة التحكم للاطلاع على ملخص الأسبوع والمهام والتنبيهات. يستخدم المديرون قسم الإدارة لدعوة المستخدمين، بينما يفتح المندوبون المهام المعيّنة لهم من مساحة عملهم.", dashboard: "استخدام لوحة التحكم", dashboardText: "يعرض الملخص الأسبوعي المهام المخططة والمكتملة والمفتوحة وتنبيهات سجل العمل. يمكن إخفاء البطاقات الفارغة من الزر أعلى الملخص، ويُحفظ هذا الاختيار لكل مستخدم.", field: "الزيارات والعمل الميداني", fieldText: "افتح المهمة المعيّنة، وفعّل مشاركة الموقع عند الحاجة، ثم سجّل الحضور واكتب تقرير الزيارة وارفع الأدلة الضرورية وسجّل المغادرة. استخدم خطط الزيارات والتقارير اليومية لتوثيق العمل من السبت إلى الخميس.", reports: "المصروفات والتقارير", reportsText: "قدّم مطالبات مصروفات السفر من مساحة المصروفات. يمكن للمديرين ومسؤولي النظام مراجعة التقارير وتنزيل ملفات Excel وCSV وPDF باللغة المختارة. تظل كل عملة منفصلة في ملخصات المصروفات.", privacy: "الأدلة والخصوصية", privacyText: "تُحفظ الصور والتواقيع وسجلات GPS والتقارير كسجلات تشغيلية. ارفع فقط الأدلة اللازمة للمهمة أو الزيارة المعيّنة واتبع سياسة الموافقة والاحتفاظ المعتمدة في مؤسستك.", support: "الدعم والوصول", supportText: "يتطلب التطبيق تسجيل الدخول. تواصل مع مسؤول FFM في حال وجود مشكلة في الدعوة أو الدور أو الوصول. لا تعتبر مسودات المتصفح نسخة احتياطية دائمة؛ أبلغ المسؤول عن السجلات المفقودة ليستخدم سجل النشاط والصادرات التشغيلية للتحقق.", back: "العودة إلى مدير FFM", signInRequired: "يتطلب تسجيل الدخول", signInText: "تتوفر المساعدة ودليل المستخدم للمستخدمين المسجلين في FFM.", signIn: "تسجيل الدخول بأمان", printFooter: "دليل مستخدم FFM العربي — احتفظ به كمرجع مختصر للعمليات اليومية.",
  } : {
    loading: "Loading FFM Help…", eyebrow: "FFM / OPERATIONS GUIDE", title: "Help & Privacy", subtitle: "A concise, secure operating guide for Managers, Delegates, and Warehouse Heroes.", print: "Print Arabic user guide", printHint: "A print-friendly Arabic reference for new users", start: "Getting started", startText: "Open the Dashboard for the weekly summary, tasks, and attention items. Managers use Administration to invite users, while Delegates open assigned work from their workspace.", dashboard: "Using the Dashboard", dashboardText: "The weekly snapshot shows planned, completed, and open tasks plus Work Log alerts. Use the control above the snapshot to hide empty cards; that preference is saved for each user.", field: "Visits and field work", fieldText: "Open the assigned task, enable location sharing when required, check in, write the visit report, upload only necessary evidence, and check out. Use weekly plans and daily reports to record work from Saturday through Thursday.", reports: "Expenses and reports", reportsText: "Submit travel claims from Travel Expenses. Managers and Administrators can review reports and download Excel, CSV, and PDF files in the selected language. Each currency remains separate in expense summaries.", privacy: "Evidence and privacy", privacyText: "Photos, signatures, GPS records, and reports are operational records. Upload only evidence needed for the assigned task or visit and follow your organization’s approved consent and retention policy.", support: "Access and support", supportText: "The app requires sign-in. Contact the FFM Administrator about an invitation, role, or access problem. Browser drafts are not permanent backups; report missing records so the Administrator can check activity history and operational exports.", back: "Return to FFM Manager", signInRequired: "Sign in required", signInText: "Help and the user guide are available to authenticated FFM users.", signIn: "Sign in securely", printFooter: "FFM Arabic User Guide — keep this as a concise reference for daily operations.",
  };
  const printArabicGuide = () => {
    if (!ar) {
      setLanguage("ar");
      window.setTimeout(() => window.print(), 100);
      return;
    }
    window.print();
  };
  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">{c.loading}</div></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><p className="eyebrow">FFM / HELP</p><h1>{c.signInRequired}</h1><p className="muted">{c.signInText}</p><Button className="blueprint-button" onClick={() => startLogin()}>{c.signIn}</Button></Card></div>;
  const guideSections = [
    { title: c.start, text: c.startText, icon: BookOpenCheck },
    { title: c.dashboard, text: c.dashboardText, icon: BookOpenCheck },
    { title: c.field, text: c.fieldText, icon: BookOpenCheck },
    { title: c.reports, text: c.reportsText, icon: BookOpenCheck },
    { title: c.privacy, text: c.privacyText, icon: ShieldCheck },
    { title: c.support, text: c.supportText, icon: ShieldCheck },
  ];
  return <div className="blueprint-page help-page" dir={ar ? "rtl" : "ltr"}><div className="blueprint-grid"/><main className="help-content"><div className="no-print flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="muted">{c.subtitle}</p></div><div className="flex flex-wrap items-center gap-2"><LanguageSwitcher/><Button variant="outline" onClick={printArabicGuide}><Printer size={16}/>{c.print}</Button></div></div><div className="print-only mb-7 hidden"><p className="eyebrow">FFM / دليل المستخدم العربي</p><h1>دليل مستخدم FFM</h1><p>{c.subtitle}</p></div><div className="no-print mt-4 rounded-md border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100"><strong>{c.print}</strong><span className="mx-2">·</span>{c.printHint}</div><div className="help-grid mt-6">{guideSections.map(({ title, text, icon: Icon }) => <Card className="blueprint-card" key={title}><CardHeader><CardTitle className="flex items-center gap-2"><Icon size={18}/>{title}</CardTitle></CardHeader><CardContent><p>{text}</p></CardContent></Card>)}</div><p className="print-only mt-8 hidden text-sm">{c.printFooter}</p><div className="no-print mt-6"><Link href="/"><Button className="blueprint-button">{c.back}</Button></Link></div></main></div>;
}
