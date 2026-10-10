// Citizen-facing strings in English, Hindi and Marathi. Translations were drafted
// with AI help and are marked for review by a native speaker before wider use.

export type Lang = "en" | "hi" | "mr";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

type Dict = Record<string, Record<Lang, string>>;

export const T: Dict = {
  title: { en: "Check your eligibility", hi: "अपनी पात्रता जांचें", mr: "तुमची पात्रता तपासा" },
  intro: {
    en: "Answer a few questions. Niyam shows which schemes you may qualify for, why, and the official source. Nothing you enter leaves your device.",
    hi: "कुछ सवालों के जवाब दें। नियम दिखाएगा कि आप किन योजनाओं के लिए पात्र हो सकते हैं, क्यों, और आधिकारिक स्रोत। आपकी जानकारी आपके डिवाइस से बाहर नहीं जाती।",
    mr: "काही प्रश्नांची उत्तरे द्या. नियम दाखवेल की तुम्ही कोणत्या योजनांसाठी पात्र असू शकता, का, आणि अधिकृत स्रोत. तुमची माहिती तुमच्या डिव्हाइसबाहेर जात नाही.",
  },
  date: { en: "Check for this date", hi: "इस तारीख के लिए जांचें", mr: "या तारखेसाठी तपासा" },
  age: { en: "Age in completed years", hi: "पूरे किए गए वर्षों में आयु", mr: "पूर्ण वर्षांतील वय" },
  gender: { en: "Gender", hi: "लिंग", mr: "लिंग" },
  female: { en: "Woman", hi: "महिला", mr: "महिला" },
  male: { en: "Man", hi: "पुरुष", mr: "पुरुष" },
  other: { en: "Other", hi: "अन्य", mr: "इतर" },
  state: { en: "Lives in Maharashtra", hi: "महाराष्ट्र में रहती/रहते हैं", mr: "महाराष्ट्रात राहतात" },
  marital_status: { en: "Marital status", hi: "वैवाहिक स्थिति", mr: "वैवाहिक स्थिती" },
  married: { en: "Married", hi: "विवाहित", mr: "विवाहित" },
  widowed: { en: "Widowed", hi: "विधवा", mr: "विधवा" },
  divorced: { en: "Divorced", hi: "तलाकशुदा", mr: "घटस्फोटित" },
  abandoned: { en: "Abandoned", hi: "परित्यक्ता", mr: "परित्यक्ता" },
  destitute: { en: "Destitute", hi: "निराधार", mr: "निराधार" },
  unmarried: { en: "Unmarried", hi: "अविवाहित", mr: "अविवाहित" },
  annual_family_income: { en: "Annual family income (Rs)", hi: "परिवार की वार्षिक आय (रु.)", mr: "कुटुंबाचे वार्षिक उत्पन्न (रु.)" },
  other_scheme_monthly_inr: { en: "Money already received each month from other government schemes (Rs)", hi: "अन्य सरकारी योजनाओं से हर महीने मिलने वाली राशि (रु.)", mr: "इतर शासकीय योजनांमधून दरमहा मिळणारी रक्कम (रु.)" },
  family_govt_job: { en: "Government job in the family", hi: "परिवार में सरकारी नौकरी", mr: "कुटुंबातील शासकीय नोकरी" },
  none: { en: "None", hi: "कोई नहीं", mr: "नाही" },
  regular: { en: "Regular or permanent employee", hi: "नियमित या स्थायी कर्मचारी", mr: "नियमित किंवा कायम कर्मचारी" },
  contract: { en: "Contract employee", hi: "संविदा कर्मचारी", mr: "कंत्राटी कर्मचारी" },
  outsourced: { en: "Outsourced worker", hi: "आउटसोर्स कर्मचारी", mr: "बाह्य यंत्रणेद्वारे कर्मचारी" },
  volunteer: { en: "Volunteer worker", hi: "स्वयंसेवी कर्मचारी", mr: "स्वयंसेवी कामगार" },
  pensioner: { en: "Retired, receiving a pension", hi: "सेवानिवृत्त, पेंशन मिलती है", mr: "सेवानिवृत्त, निवृत्तीवेतन मिळते" },
  family_income_tax_payer: { en: "Someone in the family pays income tax", hi: "परिवार में कोई आयकर देता है", mr: "कुटुंबातील कोणी आयकर भरतो" },
  family_four_wheeler: { en: "A car or other four-wheeler (not a tractor) is registered to the family", hi: "परिवार के नाम पर कार या चार पहिया वाहन (ट्रैक्टर नहीं) है", mr: "कुटुंबाच्या नावावर चारचाकी वाहन (ट्रॅक्टर वगळून) आहे" },
  family_mp_mla: { en: "A family member is a current or former MP or MLA", hi: "परिवार का कोई सदस्य वर्तमान या पूर्व सांसद या विधायक है", mr: "कुटुंबातील सदस्य विद्यमान किंवा माजी खासदार किंवा आमदार आहे" },
  years_in_maharashtra: { en: "Years lived in Maharashtra", hi: "महाराष्ट्र में रहने के वर्ष", mr: "महाराष्ट्रात राहिलेली वर्षे" },
  children_count: { en: "Number of children", hi: "बच्चों की संख्या", mr: "मुलांची संख्या" },
  disabled: { en: "Person with a disability (divyang)", hi: "दिव्यांग व्यक्ति", mr: "दिव्यांग व्यक्ती" },
  has_bank_account: { en: "Has a bank account", hi: "बैंक खाता है", mr: "बँक खाते आहे" },
  family_farm_land_acres: { en: "Farm land owned by the family (acres)", hi: "परिवार की खेती की जमीन (एकड़)", mr: "कुटुंबाची शेतजमीन (एकर)" },
  other_unmarried_beneficiary_in_family: { en: "Another unmarried woman in the family already gets this benefit", hi: "परिवार की एक और अविवाहित महिला को पहले से यह लाभ मिलता है", mr: "कुटुंबातील दुसऱ्या अविवाहित महिलेला आधीच हा लाभ मिळतो" },
  check: { en: "Check eligibility", hi: "पात्रता जांचें", mr: "पात्रता तपासा" },
  eligible: { en: "You may be eligible", hi: "आप पात्र हो सकती/सकते हैं", mr: "तुम्ही पात्र असू शकता" },
  not_eligible: { en: "You are probably not eligible", hi: "आप शायद पात्र नहीं हैं", mr: "तुम्ही बहुधा पात्र नाही" },
  not_in_force: { en: "This scheme had not started on that date", hi: "उस तारीख को यह योजना शुरू नहीं हुई थी", mr: "त्या तारखेला ही योजना सुरू झाली नव्हती" },
  per_month: { en: "per month", hi: "प्रति माह", mr: "दरमहा" },
  why: { en: "Why", hi: "क्यों", mr: "का" },
  met: { en: "Met", hi: "पूरा", mr: "पूर्ण" },
  not_met: { en: "Not met", hi: "पूरा नहीं", mr: "पूर्ण नाही" },
  apply: { en: "How to apply (official site)", hi: "आवेदन कैसे करें (आधिकारिक साइट)", mr: "अर्ज कसा करावा (अधिकृत संकेतस्थळ)" },
  disclaimer: {
    en: "Information only. The government department makes the final decision.",
    hi: "केवल जानकारी के लिए। अंतिम निर्णय सरकारी विभाग करता है।",
    mr: "केवळ माहितीसाठी. अंतिम निर्णय शासकीय विभाग घेतो.",
  },
  privacy: {
    en: "We never ask for your name, Aadhaar or phone number. The check runs in your browser.",
    hi: "हम कभी आपका नाम, आधार या फोन नंबर नहीं मांगते। जांच आपके ब्राउज़र में होती है।",
    mr: "आम्ही कधीही तुमचे नाव, आधार किंवा फोन नंबर विचारत नाही. तपासणी तुमच्या ब्राउझरमध्ये होते.",
  },
  more: { en: "More questions (optional)", hi: "और सवाल (वैकल्पिक)", mr: "अधिक प्रश्न (ऐच्छिक)" },
  review_note: {
    en: "Hindi and Marathi text was drafted with AI help and is awaiting review by a native speaker.",
    hi: "हिंदी और मराठी पाठ AI की मदद से तैयार किया गया है और मूल भाषी द्वारा समीक्षा बाकी है।",
    mr: "हिंदी आणि मराठी मजकूर AI च्या मदतीने तयार केला आहे आणि मूळ भाषिकाकडून तपासणी बाकी आहे.",
  },
};

export const WHY_ASKED: Record<string, string> = {
  age: "Schemes set minimum and maximum ages.",
  annual_family_income: "Most schemes have an income ceiling for the whole family.",
  other_scheme_monthly_inr: "Some schemes pay only the difference if you already receive money from another scheme.",
  family_govt_job: "Families with permanent government jobs are usually excluded; contract and outsourced workers may not be.",
  marital_status: "Some schemes are for specific groups, such as widows or married women.",
};

export const t = (key: string, lang: Lang) => T[key]?.[lang] ?? T[key]?.en ?? key;
