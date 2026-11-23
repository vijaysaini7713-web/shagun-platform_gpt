import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";
const dict = {
  appName: { en: "ShagunSetu", hi: "शगुनसेतु" },
  tagline: { en: "Gifts & shagun, gracefully managed", hi: "उपहार और शगुन, सलीके से" },
  demo: { en: "DEMO", hi: "डेमो" },
  sandboxOnly: { en: "SANDBOX ONLY — no real money moves", hi: "केवल सैंडबॉक्स — कोई असली भुगतान नहीं" },
  signIn: { en: "Sign in", hi: "साइन इन" },
  signOut: { en: "Sign out", hi: "साइन आउट" },
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  tryGuest: { en: "Try guest journey", hi: "मेहमान अनुभव देखें" },
  tryAdmin: { en: "Open admin demo", hi: "एडमिन डेमो खोलें" },
  welcome: { en: "Welcome to the wedding of", hi: "विवाह समारोह में आपका स्वागत है" },
  start: { en: "Begin", hi: "शुरू करें" },
  whichSide: { en: "Which side are you from?", hi: "आप किस पक्ष से हैं?" },
  brideSide: { en: "Bride's side", hi: "वधू पक्ष" },
  groomSide: { en: "Groom's side", hi: "वर पक्ष" },
  relation: { en: "Your relation", hi: "आपका रिश्ता" },
  yourName: { en: "Full name", hi: "पूरा नाम" },
  phone: { en: "Mobile number", hi: "मोबाइल नंबर" },
  next: { en: "Next", hi: "आगे" },
  back: { en: "Back", hi: "पीछे" },
  whatGift: { en: "What are you giving?", hi: "आप क्या दे रहे हैं?" },
  physicalGift: { en: "Physical gift", hi: "उपहार (सामान)" },
  envelope: { en: "Shagun envelope", hi: "शगुन लिफ़ाफ़ा" },
  digital: { en: "Digital shagun", hi: "डिजिटल शगुन" },
  photo: { en: "Photo", hi: "फ़ोटो" },
  description: { en: "Description", hi: "विवरण" },
  amountOptional: { en: "Amount (optional)", hi: "राशि (वैकल्पिक)" },
  amount: { en: "Amount (₹)", hi: "राशि (₹)" },
  simulate: { en: "Simulated outcome", hi: "नकली परिणाम" },
  submit: { en: "Submit blessing", hi: "आशीर्वाद भेजें" },
  receipt: { en: "Your receipt", hi: "आपकी रसीद" },
  showAtCounter: { en: "Show this code at the gift counter", hi: "यह कोड गिफ्ट काउंटर पर दिखाएँ" },
  overview: { en: "Overview", hi: "सारांश" },
  guests: { en: "Guests", hi: "मेहमान" },
  gifts: { en: "Physical gifts", hi: "उपहार" },
  envelopes: { en: "Envelopes", hi: "लिफ़ाफ़े" },
  payments: { en: "Payments", hi: "भुगतान" },
  transactions: { en: "Activity", hi: "गतिविधि" },
  reports: { en: "Reports", hi: "रिपोर्ट" },
  counters: { en: "Counters", hi: "काउंटर" },
  settings: { en: "Settings", hi: "सेटिंग्स" },
  qr: { en: "QR code", hi: "क्यूआर कोड" },
  team: { en: "Team", hi: "टीम" },
  staffCounter: { en: "Gift counter", hi: "गिफ्ट काउंटर" },
  search: { en: "Search reference, name or phone", hi: "रेफ़रेंस, नाम या फ़ोन खोजें" },
  markReceived: { en: "Mark received", hi: "प्राप्त चिह्नित करें" },
  handover: { en: "Hand over", hi: "सौंपें" },
  status_declared: { en: "Declared", hi: "घोषित" },
  status_received: { en: "Received", hi: "प्राप्त" },
  status_handed_over: { en: "Handed over", hi: "सौंपा गया" },
  status_success: { en: "Success", hi: "सफल" },
  status_failed: { en: "Failed", hi: "विफल" },
  status_pending: { en: "Pending", hi: "लंबित" },
} as const;
export type TKey = keyof typeof dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => dict[k].en,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = localStorage.getItem("ss-lang");
    if (s === "hi" || s === "en") setLangState(s);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("ss-lang", l);
  };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[k][lang] }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);