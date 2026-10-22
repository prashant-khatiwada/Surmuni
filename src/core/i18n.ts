// Trilingual Internationalization (i18n) Engine
// English (Default), Nepali (नेपाली), and Hindi (हिन्दी)

export type SupportedLang = "en" | "ne" | "hi";

export interface Translations {
  prefs_title: string;
  tab_skins: string;
  tab_audio: string;
  tab_language: string;
  tab_keyboard: string;
  tab_about: string;
  installed_skins: string;
  load_wsz: string;
  browse_museum: string;
  dsp_tuning: string;
  crossfade_sec: string;
  autodj_label: string;
  autodj_status: string;
  replaygain_label: string;
  replaygain_status: string;
  language_heading: string;
  language_select_label: string;
  keyboard_heading: string;
  about_heading: string;
  about_desc1: string;
  about_desc2: string;
  btn_close: string;
  lib_heading: string;
  empty_pl_msg: string;
  btn_add_file: string;
  btn_clear_pl: string;
  btn_shuffle_pl: string;
  btn_load_pl: string;
  btn_save_pl: string;
}

export const translations: Record<SupportedLang, Translations> = {
  en: {
    prefs_title: "PREFERENCES [Ctrl+P]",
    tab_skins: "Skins & Themes",
    tab_audio: "Audio & Crossfade",
    tab_language: "Language (भाषा)",
    tab_keyboard: "Keyboard Shortcuts",
    tab_about: "About Surmuni",
    installed_skins: "Installed Themes & Skins",
    load_wsz: "📂 Load Local .WSZ Skin...",
    browse_museum: "🌐 Browse Skin Museum (65k+ Skins)",
    dsp_tuning: "DSP & Playback Tuning",
    crossfade_sec: "Hardware Crossfade (Seconds):",
    autodj_label: "Smart AutoDJ (Silence Trimming):",
    autodj_status: "Enabled (Seamless Transition)",
    replaygain_label: "ReplayGain Loudness Leveling:",
    replaygain_status: "Auto (Peak-Clamped)",
    language_heading: "Interface Language Selection",
    language_select_label: "Select Application Language:",
    keyboard_heading: "Global Keybindings & Hotkeys",
    about_heading: "Surmuni v1.0",
    about_desc1: "High-Performance Retro & Modern Audio Player in Rust + Tauri v2.",
    about_desc2: "Zero telemetry. Ultra-low footprint. 100% offline playback support for MP3, FLAC, OGG, MIDI, and Chiptunes.",
    btn_close: "CLOSE",
    lib_heading: "SURMUNI MEDIA LIBRARY [J]",
    empty_pl_msg: "Drag & Drop audio files here or click '+ FILE' below",
    btn_add_file: "+ FILE",
    btn_clear_pl: "- CLEAR",
    btn_shuffle_pl: "⚡ SHUFFLE",
    btn_load_pl: "📂 LOAD",
    btn_save_pl: "💾 SAVE",
  },
  ne: {
    prefs_title: "भोल्टएम्प प्राथमिकताहरू [Ctrl+P]",
    tab_skins: "स्किन तथा थिमहरू",
    tab_audio: "अडियो तथा क्रसफेड",
    tab_language: "भाषा (Language)",
    tab_keyboard: "किबोर्ड सर्टकटहरू",
    tab_about: "भोल्टएम्प बारे",
    installed_skins: "उपलब्ध थिम तथा स्किनहरू",
    load_wsz: "📂 स्थानीय .WSZ स्किन लोड गर्नुहोस्...",
    browse_museum: "🌐 स्किन संग्रहालय (६५,०००+ स्किन)",
    dsp_tuning: "DSP तथा प्लेब्याक सेटिङ",
    crossfade_sec: "हार्डवेयर क्रसफेड (सेकेन्ड):",
    autodj_label: "स्मार्ट AutoDJ (मौन हटाउने):",
    autodj_status: "सक्रिय (अविच्छिन्न बजाउने)",
    replaygain_label: "ReplayGain ध्वनि समिकरण:",
    replaygain_status: "स्वतः (पिक-नियन्त्रित)",
    language_heading: "इन्टरफेस भाषा छनौट",
    language_select_label: "एपको भाषा चयन गर्नुहोस्:",
    keyboard_heading: "ग्लोबल किबोर्ड सर्टकटहरू",
    about_heading: "भोल्टएम्प संस्करण १.०",
    about_desc1: "रस्ट तथा टाउरी v2 मा निर्मित उच्च-गतिको अडियो प्लेयर।",
    about_desc2: "कुनै ट्र्याकिङ छैन। न्यून मेमोरी। MP3, FLAC, OGG, MIDI तथा Chiptune को लागि पूर्ण अफलाइन समर्थन।",
    btn_close: "बन्द गर्नुहोस्",
    lib_heading: "भोल्टएम्प मिडिया लाइब्रेरी [J]",
    empty_pl_msg: "यहाँ अडियो फाइलहरू तान्नुहोस् वा तल '+ फाइल' क्लिक गर्नुहोस्",
    btn_add_file: "+ फाइल",
    btn_clear_pl: "- खाली",
    btn_shuffle_pl: "⚡ फेरबदल",
    btn_load_pl: "📂 लोड",
    btn_save_pl: "💾 सेभ",
  },
  hi: {
    prefs_title: "वोल्टएम्प प्राथमिकताएं [Ctrl+P]",
    tab_skins: "स्किन्स और थीम्स",
    tab_audio: "ऑडियो और क्रॉसफ़ेड",
    tab_language: "भाषा (Language)",
    tab_keyboard: "कीबोर्ड शॉर्टकट",
    tab_about: "वोल्टएम्प के बारे में",
    installed_skins: "उपलब्ध थीम्स और स्किन्स",
    load_wsz: "📂 स्थानीय .WSZ स्किन लोड करें...",
    browse_museum: "🌐 स्किन म्यूजियम (65,000+ स्किन्स)",
    dsp_tuning: "DSP और प्लेबैक ट्यूनिंग",
    crossfade_sec: "हार्डवेयर क्रॉसफ़ेड (सेकंड):",
    autodj_label: "स्मार्ट AutoDJ (मौन कटौती):",
    autodj_status: "सक्षम (सहज संक्रमण)",
    replaygain_label: "ReplayGain ध्वनि संतुलन:",
    replaygain_status: "स्वचालित (पीक-नियंत्रित)",
    language_heading: "इंटरफ़ेस भाषा चयन",
    language_select_label: "ऐप की भाषा चुनें:",
    keyboard_heading: "ग्लोबल कीबोर्ड शॉर्टकट्स",
    about_heading: "वोल्टएम्प संस्करण 1.0",
    about_desc1: "रस्ट और टौरी v2 में निर्मित उच्च-प्रदर्शन ऑडियो प्लेयर।",
    about_desc2: "शून्य टेलीमेट्री। अत्यंत हल्का। MP3, FLAC, OGG, MIDI और Chiptunes के लिए 100% ऑफ़लाइन समर्थन।",
    btn_close: "बंद करें",
    lib_heading: "वोल्टएम्प मीडिया लाइब्रेरी [J]",
    empty_pl_msg: "यहाँ ऑडियो फ़ाइलें खींचें या नीचे '+ फ़ाइल' पर क्लिक करें",
    btn_add_file: "+ फ़ाइल",
    btn_clear_pl: "- खाली करें",
    btn_shuffle_pl: "⚡ फेरबदल",
    btn_load_pl: "📂 लोड",
    btn_save_pl: "💾 सहेजें",
  },
};

export class I18nManager {
  private static currentLang: SupportedLang = "en";

  static init() {
    const saved = localStorage.getItem("surmuni_lang") as SupportedLang;
    if (saved && (saved === "en" || saved === "ne" || saved === "hi")) {
      this.currentLang = saved;
    }
    this.applyLanguage(this.currentLang);
  }

  static getLang(): SupportedLang {
    return this.currentLang;
  }

  static setLang(lang: SupportedLang) {
    this.currentLang = lang;
    localStorage.setItem("surmuni_lang", lang);
    this.applyLanguage(lang);
  }

  static t(key: keyof Translations): string {
    return translations[this.currentLang][key] || translations.en[key] || "";
  }

  static applyLanguage(lang: SupportedLang) {
    const dict = translations[lang];
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n") as keyof Translations;
      if (key && dict[key]) {
        el.textContent = dict[key];
      }
    });
  }
}
