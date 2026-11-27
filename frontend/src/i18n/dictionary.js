// English text is the key; anything missing simply stays in English. Add more lines here to translate more of the app.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
];

const hi = {
  // public menu and home
  Home: 'होम', 'Explore Events': 'इवेंट देखें', Categories: 'श्रेणियाँ', About: 'हमारे बारे में', Contact: 'संपर्क', Login: 'लॉग इन', Register: 'रजिस्टर करें',
  'Join UniEvents': 'UniEvents से जुड़ें', 'The campus event platform': 'कैंपस इवेंट प्लेटफ़ॉर्म',
  'Discover. Connect.': 'खोजें। जुड़ें।', 'Experience Campus Life.': 'कैंपस जीवन का अनुभव लें।',
  'Find hackathons, workshops, fests and talks happening around you. Register in a click, check in with a QR ticket and collect verified certificates.': 'अपने आसपास हो रहे हैकाथॉन, वर्कशॉप, फेस्ट और टॉक खोजें। एक क्लिक में रजिस्टर करें, QR टिकट से चेक-इन करें और सत्यापित सर्टिफ़िकेट पाएँ।',
  // dashboard menu
  Overview: 'ओवरव्यू', 'Discover Events': 'इवेंट खोजें', 'My Registrations': 'मेरे रजिस्ट्रेशन', 'My Tickets': 'मेरे टिकट', 'Attendance History': 'उपस्थिति इतिहास', 'My Payments': 'मेरे भुगतान',
  Certificates: 'सर्टिफ़िकेट', 'Points and Badges': 'अंक और बैज', Following: 'फ़ॉलो किए गए', 'Event staff duty': 'इवेंट स्टाफ़ ड्यूटी', 'My Report (PDF)': 'मेरी रिपोर्ट (PDF)',
  'Activity Transcript': 'गतिविधि ट्रांसक्रिप्ट', Notifications: 'सूचनाएँ', 'My Profile': 'मेरी प्रोफ़ाइल', Settings: 'सेटिंग्स', 'My Events': 'मेरे इवेंट', 'Create Event': 'इवेंट बनाएँ',
  'Manage Registrations': 'रजिस्ट्रेशन प्रबंधन', 'Attendee Management': 'प्रतिभागी प्रबंधन', 'QR Attendance Scanner': 'QR उपस्थिति स्कैनर', 'Scan Tickets (Camera)': 'टिकट स्कैन (कैमरा)', 'Scan Tickets': 'टिकट स्कैन करें',
  Payments: 'भुगतान', Analytics: 'विश्लेषण', 'Reports (PDF)': 'रिपोर्ट (PDF)', Announcements: 'घोषणाएँ', Profile: 'प्रोफ़ाइल', 'User Management': 'उपयोगकर्ता प्रबंधन', 'Student Management': 'छात्र प्रबंधन',
  'Organizer Management': 'आयोजक प्रबंधन', 'Event Management': 'इवेंट प्रबंधन', 'Event Approvals': 'इवेंट अनुमोदन', 'Attendance Monitoring': 'उपस्थिति निगरानी', 'Reports & Analytics': 'रिपोर्ट और विश्लेषण',
  'System Notifications': 'सिस्टम सूचनाएँ', 'Audit Logs': 'ऑडिट लॉग', 'Platform Settings': 'प्लेटफ़ॉर्म सेटिंग्स', 'Back to website': 'वेबसाइट पर वापस', 'Log out': 'लॉग आउट',
  // page headers
  'Welcome back, {name}': 'वापसी पर स्वागत है, {name}', 'Your events, tickets and progress at a glance.': 'आपके इवेंट, टिकट और प्रगति एक नज़र में।', 'Discover events': 'इवेंट खोजें',
  'My certificates': 'मेरे सर्टिफ़िकेट', 'Issued by organisers after events you attended. Each one can be verified online.': 'आपके शामिल हुए इवेंट के बाद आयोजकों द्वारा जारी। हर एक ऑनलाइन सत्यापित किया जा सकता है।',
  'My payments': 'मेरे भुगतान', 'Receipts for event fees you paid online.': 'ऑनलाइन चुकाई गई इवेंट फ़ीस की रसीदें।', 'Points and badges': 'अंक और बैज', 'Earn points by taking part in campus events.': 'कैंपस इवेंट में भाग लेकर अंक कमाएँ।',
  'My registrations': 'मेरे रजिस्ट्रेशन', 'Every event you have registered for, requested or joined the waitlist of.': 'हर वह इवेंट जिसमें आपने रजिस्टर किया, अनुरोध किया या वेटलिस्ट में जुड़े।',
  'Organisers I follow': 'मैं जिन आयोजकों को फ़ॉलो करता/करती हूँ', 'My profile': 'मेरी प्रोफ़ाइल', 'Your details are used for event eligibility and on certificates.': 'आपकी जानकारी इवेंट पात्रता और सर्टिफ़िकेट में उपयोग होती है।',
  'Appearance, notifications and security.': 'रूप-रंग, सूचनाएँ और सुरक्षा।', 'Event check-in': 'इवेंट चेक-इन', 'Event staff duty': 'इवेंट स्टाफ़ ड्यूटी',
  'Volunteer hours': 'स्वयंसेवा घंटे', 'Event Ratings': 'इवेंट रेटिंग', 'Event ratings': 'इवेंट रेटिंग',
  Language: 'भाषा',
};

const bn = {
  Home: 'হোম', 'Explore Events': 'ইভেন্ট দেখুন', Categories: 'বিভাগ', About: 'আমাদের সম্পর্কে', Contact: 'যোগাযোগ', Login: 'লগ ইন', Register: 'রেজিস্টার করুন',
  'Join UniEvents': 'UniEvents-এ যোগ দিন', 'The campus event platform': 'ক্যাম্পাস ইভেন্ট প্ল্যাটফর্ম',
  'Discover. Connect.': 'আবিষ্কার করুন। যুক্ত হোন।', 'Experience Campus Life.': 'ক্যাম্পাস জীবনের অভিজ্ঞতা নিন।',
  'Find hackathons, workshops, fests and talks happening around you. Register in a click, check in with a QR ticket and collect verified certificates.': 'আপনার আশেপাশের হ্যাকাথন, ওয়ার্কশপ, ফেস্ট ও আলোচনা খুঁজুন। এক ক্লিকে রেজিস্টার করুন, QR টিকিটে চেক-ইন করুন এবং যাচাইকৃত সার্টিফিকেট পান।',
  Overview: 'ওভারভিউ', 'Discover Events': 'ইভেন্ট খুঁজুন', 'My Registrations': 'আমার রেজিস্ট্রেশন', 'My Tickets': 'আমার টিকিট', 'Attendance History': 'উপস্থিতির ইতিহাস', 'My Payments': 'আমার পেমেন্ট',
  Certificates: 'সার্টিফিকেট', 'Points and Badges': 'পয়েন্ট ও ব্যাজ', Following: 'অনুসরণ করছি', 'Event staff duty': 'ইভেন্ট স্টাফ ডিউটি', 'My Report (PDF)': 'আমার রিপোর্ট (PDF)',
  'Activity Transcript': 'কার্যকলাপ ট্রান্সক্রিপ্ট', Notifications: 'বিজ্ঞপ্তি', 'My Profile': 'আমার প্রোফাইল', Settings: 'সেটিংস', 'My Events': 'আমার ইভেন্ট', 'Create Event': 'ইভেন্ট তৈরি করুন',
  'Manage Registrations': 'রেজিস্ট্রেশন পরিচালনা', 'Attendee Management': 'অংশগ্রহণকারী পরিচালনা', 'QR Attendance Scanner': 'QR উপস্থিতি স্ক্যানার', 'Scan Tickets (Camera)': 'টিকিট স্ক্যান (ক্যামেরা)', 'Scan Tickets': 'টিকিট স্ক্যান করুন',
  Payments: 'পেমেন্ট', Analytics: 'বিশ্লেষণ', 'Reports (PDF)': 'রিপোর্ট (PDF)', Announcements: 'ঘোষণা', Profile: 'প্রোফাইল', 'User Management': 'ব্যবহারকারী পরিচালনা', 'Student Management': 'শিক্ষার্থী পরিচালনা',
  'Organizer Management': 'আয়োজক পরিচালনা', 'Event Management': 'ইভেন্ট পরিচালনা', 'Event Approvals': 'ইভেন্ট অনুমোদন', 'Attendance Monitoring': 'উপস্থিতি পর্যবেক্ষণ', 'Reports & Analytics': 'রিপোর্ট ও বিশ্লেষণ',
  'System Notifications': 'সিস্টেম বিজ্ঞপ্তি', 'Audit Logs': 'অডিট লগ', 'Platform Settings': 'প্ল্যাটফর্ম সেটিংস', 'Back to website': 'ওয়েবসাইটে ফিরুন', 'Log out': 'লগ আউট',
  'Welcome back, {name}': 'আবার স্বাগতম, {name}', 'Your events, tickets and progress at a glance.': 'আপনার ইভেন্ট, টিকিট ও অগ্রগতি এক নজরে।', 'Discover events': 'ইভেন্ট খুঁজুন',
  'My certificates': 'আমার সার্টিফিকেট', 'Issued by organisers after events you attended. Each one can be verified online.': 'আপনি যে ইভেন্টে অংশ নিয়েছেন তার পর আয়োজকরা দেন। প্রতিটি অনলাইনে যাচাই করা যায়।',
  'My payments': 'আমার পেমেন্ট', 'Receipts for event fees you paid online.': 'অনলাইনে দেওয়া ইভেন্ট ফির রসিদ।', 'Points and badges': 'পয়েন্ট ও ব্যাজ', 'Earn points by taking part in campus events.': 'ক্যাম্পাস ইভেন্টে অংশ নিয়ে পয়েন্ট অর্জন করুন।',
  'My registrations': 'আমার রেজিস্ট্রেশন', 'Every event you have registered for, requested or joined the waitlist of.': 'আপনি যে ইভেন্টে রেজিস্টার, অনুরোধ বা ওয়েটলিস্টে যোগ দিয়েছেন সবকিছু।',
  'Organisers I follow': 'আমি যাদের অনুসরণ করি', 'My profile': 'আমার প্রোফাইল', 'Your details are used for event eligibility and on certificates.': 'আপনার তথ্য ইভেন্টের যোগ্যতা ও সার্টিফিকেটে ব্যবহৃত হয়।',
  'Appearance, notifications and security.': 'চেহারা, বিজ্ঞপ্তি ও নিরাপত্তা।', 'Event check-in': 'ইভেন্ট চেক-ইন',
  'Volunteer hours': 'স্বেচ্ছাসেবক ঘণ্টা', 'Event Ratings': 'ইভেন্ট রেটিং', 'Event ratings': 'ইভেন্ট রেটিং',
  Language: 'ভাষা',
};

export const DICTIONARY = { hi, bn };
