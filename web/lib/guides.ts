// "About this page" boxes: what the page is, who it is for, and what to do there.
// English is always shown; Hindi and Marathi appear alongside it when chosen.
// Hindi and Marathi were drafted with AI help and need review by a native speaker.

import type { Lang } from "./i18n";

type T = Record<Lang, string>;
export type Guide = { what: T; who: T; todo: T };

export const NIYAM_ONE_LINE: T = {
  en: "Niyam is a free tool that keeps the rules of government welfare schemes up to date, and shows the official source of every rule.",
  hi: "नियम एक मुफ्त टूल है जो सरकारी कल्याण योजनाओं के नियमों को अपडेट रखता है और हर नियम का आधिकारिक स्रोत दिखाता है।",
  mr: "नियम हे एक मोफत साधन आहे जे शासकीय कल्याण योजनांचे नियम अद्ययावत ठेवते आणि प्रत्येक नियमाचा अधिकृत स्रोत दाखवते.",
};

export const GUIDES: Record<string, Guide> = {
  "how-it-works": {
    what: { en: "A step-by-step explanation of how Niyam turns a new government order into correct, checked rules.", hi: "नियम किसी नए सरकारी आदेश को सही और जांचे हुए नियमों में कैसे बदलता है, इसका चरण-दर-चरण विवरण।", mr: "नियम नवीन शासकीय आदेशाचे बरोबर आणि तपासलेल्या नियमांमध्ये रूपांतर कसे करतो, याचे टप्प्याटप्प्याने स्पष्टीकरण." },
    who: { en: "Anyone curious how it works, and judges checking the agent.", hi: "जो जानना चाहते हैं कि यह कैसे काम करता है, और जज।", mr: "हे कसे काम करते हे जाणून घेऊ इच्छिणारे सर्व, आणि परीक्षक." },
    todo: { en: "Read the seven steps from top to bottom. Each one says what can go wrong and shows a real example.", hi: "सात चरण ऊपर से नीचे पढ़ें। हर चरण बताता है कि क्या गलत हो सकता है और एक असली उदाहरण दिखाता है।", mr: "सात टप्पे वरपासून खालपर्यंत वाचा. प्रत्येक टप्पा काय चुकू शकते ते सांगतो आणि खरे उदाहरण दाखवतो." },
  },
  demo: {
    what: { en: "A recording of Niyam reading a real government order (in Marathi) and updating the rules, step by step.", hi: "नियम द्वारा एक असली सरकारी आदेश (मराठी में) पढ़कर नियम अपडेट करने की चरण-दर-चरण रिकॉर्डिंग।", mr: "नियमने खरा शासकीय आदेश (मराठीत) वाचून नियम अद्ययावत केल्याचे टप्प्याटप्प्याने रेकॉर्डिंग." },
    who: { en: "Anyone who wants to see the agent work, especially judges.", hi: "जो एजेंट को काम करते देखना चाहते हैं, खासकर जज।", mr: "एजंटला काम करताना पाहू इच्छिणारे सर्व, विशेषतः परीक्षक." },
    todo: { en: "Press Play. Then open the tabs: Document (what the order says), Code change, Verification (the independent check) and Decision.", hi: "प्ले दबाएं। फिर टैब खोलें: दस्तावेज़ (आदेश क्या कहता है), कोड बदलाव, सत्यापन (स्वतंत्र जांच) और निर्णय।", mr: "प्ले दाबा. मग टॅब उघडा: दस्तऐवज (आदेश काय सांगतो), कोड बदल, पडताळणी (स्वतंत्र तपासणी) आणि निर्णय." },
  },
  explore: {
    what: { en: "Every rule of each scheme in plain words, as it was on any date you choose.", hi: "हर योजना का हर नियम सरल शब्दों में, आपकी चुनी हुई किसी भी तारीख के अनुसार।", mr: "प्रत्येक योजनेचा प्रत्येक नियम सोप्या शब्दांत, तुम्ही निवडलेल्या कोणत्याही तारखेनुसार." },
    who: { en: "Field workers, NGOs and anyone who wants to check a rule against the law.", hi: "फील्ड कार्यकर्ता, एनजीओ और कोई भी जो किसी नियम को कानून से मिलाना चाहता है।", mr: "क्षेत्रीय कार्यकर्ते, स्वयंसेवी संस्था आणि नियम कायद्याशी जुळवू इच्छिणारे कोणीही." },
    todo: { en: "Choose a scheme and a date. Press Why? next to a rule to see the exact sentence of the government order behind it.", hi: "योजना और तारीख चुनें। किसी नियम के आगे Why? दबाएं, उसके पीछे सरकारी आदेश का सटीक वाक्य देखने के लिए।", mr: "योजना आणि तारीख निवडा. नियमापुढील Why? दाबा, त्यामागील शासकीय आदेशातील नेमके वाक्य पाहण्यासाठी." },
  },
  check: {
    what: { en: "A quick check of which covered schemes you may be eligible for, with the reason and the official source.", hi: "आप किन योजनाओं के लिए पात्र हो सकती/सकते हैं, इसकी त्वरित जांच, कारण और आधिकारिक स्रोत के साथ।", mr: "तुम्ही कोणत्या योजनांसाठी पात्र असू शकता याची झटपट तपासणी, कारण आणि अधिकृत स्रोतासह." },
    who: { en: "Anyone in Maharashtra, and people who help others apply.", hi: "महाराष्ट्र में कोई भी, और जो दूसरों को आवेदन में मदद करते हैं।", mr: "महाराष्ट्रातील कोणीही, आणि इतरांना अर्ज करण्यास मदत करणारे." },
    todo: { en: "Answer the questions (it takes about 2 minutes) and press Check eligibility. Nothing you type leaves your phone or computer.", hi: "सवालों के जवाब दें (लगभग 2 मिनट) और पात्रता जांचें दबाएं। आपकी जानकारी आपके फोन या कंप्यूटर से बाहर नहीं जाती।", mr: "प्रश्नांची उत्तरे द्या (सुमारे 2 मिनिटे) आणि पात्रता तपासा दाबा. तुमची माहिती तुमच्या फोन किंवा संगणकाबाहेर जात नाही." },
  },
  try: {
    what: { en: "Upload any government order and watch Niyam process it live, on a test copy of the rules.", hi: "कोई भी सरकारी आदेश अपलोड करें और नियम को उसे लाइव प्रोसेस करते देखें, नियमों की एक टेस्ट कॉपी पर।", mr: "कोणताही शासकीय आदेश अपलोड करा आणि नियमला तो थेट प्रक्रिया करताना पाहा, नियमांच्या चाचणी प्रतीवर." },
    who: { en: "People who want to test Niyam on a new document, and judges.", hi: "जो नियम को नए दस्तावेज़ पर परखना चाहते हैं, और जज।", mr: "नियमला नवीन दस्तऐवजावर तपासू इच्छिणारे, आणि परीक्षक." },
    todo: { en: "Choose a PDF or paste a link, then press Run. Each step appears as it happens. Nothing official changes.", hi: "PDF चुनें या लिंक डालें, फिर Run दबाएं। हर चरण होते ही दिखता है। कुछ भी आधिकारिक नहीं बदलता।", mr: "PDF निवडा किंवा लिंक टाका, मग Run दाबा. प्रत्येक टप्पा घडताच दिसतो. काहीही अधिकृत बदलत नाही." },
  },
  developers: {
    what: { en: "Instructions for programmers who want to use Niyam's rules in their own app, website or AI assistant.", hi: "प्रोग्रामरों के लिए निर्देश जो नियम के नियमों को अपने ऐप, वेबसाइट या AI सहायक में उपयोग करना चाहते हैं।", mr: "नियमचे नियम स्वतःच्या ॲप, वेबसाइट किंवा AI सहाय्यकात वापरू इच्छिणाऱ्या प्रोग्रामरसाठी सूचना." },
    who: { en: "Software developers. Not a developer? Use Check eligibility instead.", hi: "सॉफ्टवेयर डेवलपर। डेवलपर नहीं हैं? पात्रता जांचें का उपयोग करें।", mr: "सॉफ्टवेअर डेव्हलपर. डेव्हलपर नाही? त्याऐवजी पात्रता तपासा वापरा." },
    todo: { en: "Create a free key, copy an example, and call the API. Every answer includes the government order behind it.", hi: "मुफ्त की बनाएं, उदाहरण कॉपी करें और API को कॉल करें। हर जवाब में उसके पीछे का सरकारी आदेश शामिल होता है।", mr: "मोफत की तयार करा, उदाहरण कॉपी करा आणि API ला कॉल करा. प्रत्येक उत्तरात त्यामागील शासकीय आदेश असतो." },
  },
  judges: {
    what: { en: "Every neatHack judging criterion, with the evidence for it one click away.", hi: "neatHack का हर निर्णय मानदंड, उसके प्रमाण एक क्लिक पर।", mr: "neatHack चा प्रत्येक निकष, त्याचा पुरावा एका क्लिकवर." },
    who: { en: "Hackathon judges. Everyone else: start on the home page.", hi: "हैकाथॉन जज। बाकी सभी: होम पेज से शुरू करें।", mr: "हॅकाथॉन परीक्षक. इतर सर्वांनी: मुख्य पानापासून सुरुवात करा." },
    todo: { en: "Follow the 3-minute path below: watch the run, open the real pull request and checkpoint, then look at the measured results.", hi: "नीचे दिए 3 मिनट के रास्ते पर चलें: रन देखें, असली पुल रिक्वेस्ट और चेकपॉइंट खोलें, फिर मापे गए परिणाम देखें।", mr: "खालील 3 मिनिटांचा मार्ग वापरा: रन पाहा, खरी पुल रिक्वेस्ट आणि चेकपॉइंट उघडा, मग मोजलेले निकाल पाहा." },
  },
  learn: {
    what: { en: "Short explanations, in plain words, of every idea behind Niyam.", hi: "नियम के पीछे के हर विचार की सरल शब्दों में छोटी व्याख्या।", mr: "नियममागील प्रत्येक कल्पनेचे सोप्या शब्दांत छोटे स्पष्टीकरण." },
    who: { en: "Anyone, with no technical background needed.", hi: "कोई भी, तकनीकी जानकारी की जरूरत नहीं।", mr: "कोणीही, तांत्रिक ज्ञानाची गरज नाही." },
    todo: { en: "Pick any question from the list. Each answer takes about a minute to read. The glossary at the end explains every term.", hi: "सूची से कोई भी सवाल चुनें। हर जवाब पढ़ने में लगभग एक मिनट लगता है। अंत में शब्दावली हर शब्द समझाती है।", mr: "यादीतील कोणताही प्रश्न निवडा. प्रत्येक उत्तर वाचायला सुमारे एक मिनिट लागतो. शेवटची शब्दसूची प्रत्येक शब्द समजावते." },
  },
  trust: {
    what: { en: "When Niyam changes rules on its own, when it asks a person first, and what it never does.", hi: "नियम कब खुद नियम बदलता है, कब पहले किसी व्यक्ति से पूछता है, और क्या कभी नहीं करता।", mr: "नियम केव्हा स्वतः नियम बदलतो, केव्हा आधी व्यक्तीला विचारतो, आणि काय कधीच करत नाही." },
    who: { en: "Anyone deciding whether to trust Niyam's answers.", hi: "जो तय कर रहे हैं कि नियम के जवाबों पर भरोसा करें या नहीं।", mr: "नियमच्या उत्तरांवर विश्वास ठेवायचा का हे ठरवणारे सर्व." },
    todo: { en: "Read the three levels first. They explain exactly when a person must approve a change.", hi: "पहले तीन स्तर पढ़ें। वे बताते हैं कि कब किसी व्यक्ति को बदलाव मंजूर करना होता है।", mr: "आधी तीन स्तर वाचा. व्यक्तीने बदल केव्हा मंजूर करायचा हे ते नेमके सांगतात." },
  },
  status: {
    what: { en: "Whether Niyam is running right now, and when it last checked for new government orders.", hi: "क्या नियम अभी चल रहा है, और उसने आखिरी बार नए सरकारी आदेश कब जांचे।", mr: "नियम आत्ता चालू आहे का, आणि त्याने नवीन शासकीय आदेश शेवटचे केव्हा तपासले." },
    who: { en: "Judges and anyone checking the agent is really live.", hi: "जज और कोई भी जो देखना चाहता है कि एजेंट सच में चल रहा है।", mr: "परीक्षक आणि एजंट खरोखर चालू आहे का ते पाहू इच्छिणारे कोणीही." },
    todo: { en: "Look at the Live box. OK means the official list of orders was read successfully on the time shown.", hi: "लाइव बॉक्स देखें। OK का मतलब है कि आदेशों की आधिकारिक सूची दिखाए गए समय पर सफलतापूर्वक पढ़ी गई।", mr: "लाइव्ह बॉक्स पाहा. OK म्हणजे आदेशांची अधिकृत यादी दाखवलेल्या वेळी यशस्वीपणे वाचली गेली." },
  },
};
