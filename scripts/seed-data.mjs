// Demo catalog used to generate placeholder images (public/seed) and supabase/seed.sql.
// Everything here can be replaced later from the dashboard.

export const categories = [
  { slug: "medicines", name_en: "Medicines", name_ar: "الأدوية", icon: "pill" },
  { slug: "vitamins", name_en: "Vitamins & Supplements", name_ar: "الفيتامينات والمكملات", icon: "flask-round" },
  { slug: "personal-care", name_en: "Personal Care", name_ar: "العناية الشخصية", icon: "spray-can" },
  { slug: "baby-care", name_en: "Baby Care", name_ar: "العناية بالطفل", icon: "baby" },
  { slug: "herbal", name_en: "Herbal & Natural", name_ar: "الأعشاب والمنتجات الطبيعية", icon: "leaf" },
  { slug: "diabetes-care", name_en: "Diabetes Care", name_ar: "رعاية مرضى السكري", icon: "droplet" },
  { slug: "medical-devices", name_en: "Health Devices", name_ar: "الأجهزة الطبية", icon: "heart-pulse" },
  { slug: "first-aid", name_en: "First Aid", name_ar: "الإسعافات الأولية", icon: "cross" },
];

export const companies = [
  {
    slug: "nova-pharma",
    name_en: "Nova Pharma",
    name_ar: "نوفا فارما",
    short: "NOVA",
    color: "#1D5FA8",
    established_year: 2006,
    tagline_en: "Everyday medicines you can trust",
    tagline_ar: "أدوية يومية موثوقة",
    description_en:
      "Nova Pharma supplies essential over-the-counter and prescription medicines across the UAE, sourced and stored through Sharjah Drug Store under strict quality and cold-chain standards.",
    description_ar:
      "توفر نوفا فارما الأدوية الأساسية والأدوية الموصوفة في جميع أنحاء الإمارات، ويتم توريدها وتخزينها عبر مستودع الشارقة للأدوية وفق أعلى معايير الجودة وسلسلة التبريد.",
  },
  {
    slug: "medilife-labs",
    name_en: "MediLife Labs",
    name_ar: "ميديلايف لابز",
    short: "MEDILIFE",
    color: "#0E8A7E",
    established_year: 2010,
    tagline_en: "Science-backed vitamins & supplements",
    tagline_ar: "فيتامينات ومكملات مدعومة علميًا",
    description_en:
      "MediLife Labs focuses on high-quality vitamins, minerals and daily supplements formulated to support immunity, energy and long-term wellness for the whole family.",
    description_ar:
      "تركز ميديلايف لابز على الفيتامينات والمعادن والمكملات اليومية عالية الجودة، المصممة لدعم المناعة والطاقة والصحة على المدى الطويل لجميع أفراد العائلة.",
  },
  {
    slug: "zayna-care",
    name_en: "Zayna Care",
    name_ar: "زينة كير",
    short: "ZAYNA",
    color: "#B83268",
    established_year: 2013,
    tagline_en: "Gentle care for skin, baby & family",
    tagline_ar: "عناية لطيفة بالبشرة والطفل والعائلة",
    description_en:
      "Zayna Care develops dermatologically tested personal care and baby care products, made gentle enough for sensitive skin and everyday family use.",
    description_ar:
      "تطور زينة كير منتجات عناية شخصية وعناية بالطفل مختبرة جلديًا، لطيفة بما يكفي للبشرة الحساسة والاستخدام العائلي اليومي.",
  },
  {
    slug: "crescent-health",
    name_en: "Crescent Health",
    name_ar: "كريسنت هيلث",
    short: "CRESCENT",
    color: "#D0661C",
    established_year: 2009,
    tagline_en: "Diabetes care & home health devices",
    tagline_ar: "رعاية السكري والأجهزة الصحية المنزلية",
    description_en:
      "Crescent Health provides reliable diabetes care supplies, home monitoring devices and first aid essentials for pharmacies, clinics and households.",
    description_ar:
      "توفر كريسنت هيلث مستلزمات رعاية السكري وأجهزة المراقبة المنزلية ومستلزمات الإسعافات الأولية بموثوقية عالية للصيدليات والعيادات والمنازل.",
  },
  {
    slug: "oasis-herbals",
    name_en: "Oasis Herbals",
    name_ar: "واحة الأعشاب",
    short: "OASIS",
    color: "#4F7F24",
    established_year: 2015,
    tagline_en: "Natural remedies, rooted in tradition",
    tagline_ar: "علاجات طبيعية بجذور تقليدية",
    description_en:
      "Oasis Herbals brings together traditional herbal remedies and modern nutrition — from black seed oil and Sidr honey to standardized herbal extracts.",
    description_ar:
      "تجمع واحة الأعشاب بين العلاجات العشبية التقليدية والتغذية الحديثة، من زيت الحبة السوداء وعسل السدر إلى المستخلصات العشبية المعيارية.",
  },
];

// shape: box | bottle | jar | tube | device | pouch | spray
// best: position in Best Selling (1 = first)
export const products = {
  "nova-pharma": [
    { name_en: "Novadol 500 Tablets", name_ar: "نوفادول 500 أقراص", subtitle_en: "Paracetamol 500mg", subtitle_ar: "باراسيتامول 500 ملغ", category: "medicines", ingredient: "Paracetamol 500mg", pack: "24 Tablets", price: 8.5, compare: 10, shape: "box", rating: 4.8, reviews: 2140, best: 1 },
    { name_en: "Novadol Extra", name_ar: "نوفادول إكسترا", subtitle_en: "Paracetamol + Caffeine", subtitle_ar: "باراسيتامول + كافيين", category: "medicines", ingredient: "Paracetamol 500mg, Caffeine 65mg", pack: "20 Tablets", price: 12.75, compare: 15, shape: "box", rating: 4.7, reviews: 980 },
    { name_en: "Novafen 400", name_ar: "نوفافين 400", subtitle_en: "Ibuprofen 400mg", subtitle_ar: "إيبوبروفين 400 ملغ", category: "medicines", ingredient: "Ibuprofen 400mg", pack: "30 Tablets", price: 14, shape: "box", rating: 4.6, reviews: 760 },
    { name_en: "Allerclear 10mg", name_ar: "أليركلير 10 ملغ", subtitle_en: "Cetirizine – Anti-Allergic", subtitle_ar: "سيتريزين – مضاد للحساسية", category: "medicines", ingredient: "Cetirizine Hydrochloride 10mg", pack: "10 Tablets", price: 9.25, compare: 11.5, shape: "box", rating: 4.6, reviews: 1210, best: 3 },
    { name_en: "Novacough Syrup", name_ar: "شراب نوفاكوف", subtitle_en: "Dry Cough Relief", subtitle_ar: "لعلاج السعال الجاف", category: "medicines", ingredient: "Dextromethorphan HBr 15mg/5ml", pack: "120 ml", price: 18.5, shape: "bottle", rating: 4.5, reviews: 430 },
    { name_en: "Gastronova 20mg", name_ar: "جاسترونوفا 20 ملغ", subtitle_en: "Omeprazole Capsules", subtitle_ar: "كبسولات أوميبرازول", category: "medicines", ingredient: "Omeprazole 20mg", pack: "14 Capsules", price: 21, shape: "box", rating: 4.7, reviews: 640 },
    { name_en: "Novamox 500", name_ar: "نوفاموكس 500", subtitle_en: "Amoxicillin 500mg", subtitle_ar: "أموكسيسيلين 500 ملغ", category: "medicines", ingredient: "Amoxicillin 500mg", pack: "20 Capsules", price: 16, shape: "box", rating: 4.6, reviews: 390, rx: true },
    { name_en: "Novazinc Lozenges", name_ar: "أقراص استحلاب نوفازنك", subtitle_en: "Zinc + Vitamin C", subtitle_ar: "زنك + فيتامين سي", category: "medicines", ingredient: "Zinc Gluconate 10mg, Vitamin C 60mg", pack: "24 Lozenges", price: 11, shape: "box", rating: 4.4, reviews: 280 },
    { name_en: "Novaderm Antiseptic Cream", name_ar: "كريم نوفاديرم المطهر", subtitle_en: "Chlorhexidine 1%", subtitle_ar: "كلورهيكسيدين 1%", category: "first-aid", ingredient: "Chlorhexidine Gluconate 1%", pack: "30 g", price: 13.5, shape: "tube", rating: 4.5, reviews: 350 },
    { name_en: "Nova Saline Nasal Spray", name_ar: "بخاخ نوفا سالين للأنف", subtitle_en: "Sodium Chloride 0.9%", subtitle_ar: "كلوريد الصوديوم 0.9%", category: "medicines", ingredient: "Sodium Chloride 0.9%", pack: "30 ml", price: 15, shape: "spray", rating: 4.6, reviews: 510 },
  ],
  "medilife-labs": [
    { name_en: "Vitamin D3 5000 IU", name_ar: "فيتامين د3 5000 وحدة", subtitle_en: "Immune & Bone Health", subtitle_ar: "لصحة المناعة والعظام", category: "vitamins", ingredient: "Cholecalciferol 125mcg", pack: "60 Softgels", price: 39, compare: 49, shape: "jar", rating: 4.9, reviews: 1830, best: 2 },
    { name_en: "Omega-3 Fish Oil 1000mg", name_ar: "أوميغا 3 زيت السمك 1000 ملغ", subtitle_en: "Heart, Brain & Joints", subtitle_ar: "للقلب والدماغ والمفاصل", category: "vitamins", ingredient: "EPA 180mg, DHA 120mg", pack: "90 Softgels", price: 59, compare: 69, shape: "jar", rating: 4.8, reviews: 1460, best: 5 },
    { name_en: "B-Complex Capsules", name_ar: "كبسولات فيتامين ب المركب", subtitle_en: "Energy & Nerve Support", subtitle_ar: "لدعم الطاقة والأعصاب", category: "vitamins", ingredient: "Vitamins B1, B2, B3, B5, B6, B12", pack: "30 Capsules", price: 24, shape: "box", rating: 4.6, reviews: 910 },
    { name_en: "Vitamin C 1000mg Effervescent", name_ar: "فيتامين سي 1000 ملغ فوار", subtitle_en: "Orange Flavour", subtitle_ar: "بنكهة البرتقال", category: "vitamins", ingredient: "Ascorbic Acid 1000mg", pack: "20 Tablets", price: 22.5, shape: "tube", rating: 4.7, reviews: 1120 },
    { name_en: "Multivitamin Men", name_ar: "ملتي فيتامين للرجال", subtitle_en: "Daily Complete Formula", subtitle_ar: "تركيبة يومية متكاملة", category: "vitamins", ingredient: "24 Vitamins & Minerals", pack: "60 Tablets", price: 65, shape: "jar", rating: 4.6, reviews: 540 },
    { name_en: "Multivitamin Women", name_ar: "ملتي فيتامين للنساء", subtitle_en: "With Iron & Folic Acid", subtitle_ar: "مع الحديد وحمض الفوليك", category: "vitamins", ingredient: "26 Vitamins & Minerals", pack: "60 Tablets", price: 65, shape: "jar", rating: 4.7, reviews: 620 },
    { name_en: "Iron + Folic Acid", name_ar: "حديد + حمض الفوليك", subtitle_en: "Gentle on Stomach", subtitle_ar: "لطيف على المعدة", category: "vitamins", ingredient: "Ferrous Bisglycinate 25mg, Folic Acid 400mcg", pack: "30 Tablets", price: 28, shape: "box", rating: 4.5, reviews: 330 },
    { name_en: "Magnesium 400mg", name_ar: "مغنيسيوم 400 ملغ", subtitle_en: "Muscle & Sleep Support", subtitle_ar: "لدعم العضلات والنوم", category: "vitamins", ingredient: "Magnesium Citrate 400mg", pack: "60 Tablets", price: 42, shape: "jar", rating: 4.7, reviews: 470 },
    { name_en: "Calcium + D3", name_ar: "كالسيوم + د3", subtitle_en: "Strong Bones & Teeth", subtitle_ar: "لعظام وأسنان قوية", category: "vitamins", ingredient: "Calcium Carbonate 600mg, Vitamin D3 400 IU", pack: "60 Tablets", price: 36, shape: "jar", rating: 4.6, reviews: 410 },
    { name_en: "Kids Multivitamin Gummies", name_ar: "حلوى ملتي فيتامين للأطفال", subtitle_en: "Mixed Fruit Flavour", subtitle_ar: "بنكهة الفواكه المشكلة", category: "vitamins", ingredient: "13 Essential Vitamins", pack: "60 Gummies", price: 48, shape: "jar", rating: 4.8, reviews: 760 },
  ],
  "zayna-care": [
    { name_en: "Gentle Baby Shampoo", name_ar: "شامبو الأطفال اللطيف", subtitle_en: "Tear-Free Formula", subtitle_ar: "تركيبة لا تسبب الدموع", category: "baby-care", ingredient: "Chamomile & Aloe Vera", pack: "300 ml", price: 24, shape: "bottle", rating: 4.8, reviews: 690 },
    { name_en: "Baby Diaper Rash Cream", name_ar: "كريم الطفح الجلدي للأطفال", subtitle_en: "Zinc Oxide 15%", subtitle_ar: "أكسيد الزنك 15%", category: "baby-care", ingredient: "Zinc Oxide 15%, Panthenol", pack: "100 g", price: 19.5, shape: "tube", rating: 4.8, reviews: 820 },
    { name_en: "Baby Wipes Sensitive", name_ar: "مناديل الأطفال للبشرة الحساسة", subtitle_en: "99% Water, Fragrance-Free", subtitle_ar: "99% ماء، بدون عطر", category: "baby-care", ingredient: "Purified Water, Aloe Vera", pack: "72 Wipes", price: 12, shape: "pouch", rating: 4.7, reviews: 950 },
    { name_en: "Baby Moisturizing Lotion", name_ar: "لوشن مرطب للأطفال", subtitle_en: "24h Hydration", subtitle_ar: "ترطيب لمدة 24 ساعة", category: "baby-care", ingredient: "Shea Butter & Oat Extract", pack: "250 ml", price: 26, shape: "bottle", rating: 4.6, reviews: 410 },
    { name_en: "Hydrating Face Cleanser", name_ar: "غسول الوجه المرطب", subtitle_en: "For Normal to Dry Skin", subtitle_ar: "للبشرة العادية إلى الجافة", category: "personal-care", ingredient: "Ceramides & Hyaluronic Acid", pack: "200 ml", price: 45, shape: "bottle", rating: 4.7, reviews: 560 },
    { name_en: "Sunscreen SPF 50+", name_ar: "واقي شمس SPF 50+", subtitle_en: "Invisible Fluid", subtitle_ar: "سائل شفاف", category: "personal-care", ingredient: "Broad Spectrum UVA/UVB", pack: "50 ml", price: 69, compare: 79, shape: "tube", rating: 4.8, reviews: 1290, best: 6 },
    { name_en: "Intensive Moisturizing Cream", name_ar: "كريم الترطيب المكثف", subtitle_en: "Face & Body", subtitle_ar: "للوجه والجسم", category: "personal-care", ingredient: "Glycerin, Urea 5%", pack: "100 g", price: 38, shape: "jar", rating: 4.6, reviews: 380 },
    { name_en: "Antibacterial Hand Wash", name_ar: "غسول اليدين المضاد للبكتيريا", subtitle_en: "Kills 99.9% of Germs", subtitle_ar: "يقضي على 99.9% من الجراثيم", category: "personal-care", ingredient: "Benzalkonium Chloride", pack: "500 ml", price: 14, shape: "bottle", rating: 4.5, reviews: 720 },
    { name_en: "Sensitive Toothpaste", name_ar: "معجون أسنان للأسنان الحساسة", subtitle_en: "With Fluoride", subtitle_ar: "بالفلورايد", category: "personal-care", ingredient: "Potassium Nitrate 5%, Sodium Fluoride", pack: "100 ml", price: 16.5, shape: "tube", rating: 4.6, reviews: 450 },
    { name_en: "Lip Repair Balm", name_ar: "بلسم إصلاح الشفاه", subtitle_en: "Shea & Vitamin E", subtitle_ar: "زبدة الشيا وفيتامين هـ", category: "personal-care", ingredient: "Shea Butter, Vitamin E", pack: "10 g", price: 15, shape: "tube", rating: 4.5, reviews: 260 },
  ],
  "crescent-health": [
    { name_en: "GlucoCheck Glucometer", name_ar: "جهاز جلوكوتشيك لقياس السكر", subtitle_en: "Fast 5-Second Results", subtitle_ar: "نتائج سريعة خلال 5 ثوانٍ", category: "diabetes-care", ingredient: "Blood Glucose Monitoring System", pack: "1 Kit", price: 89, compare: 110, shape: "device", device: "glucometer", rating: 4.7, reviews: 640 },
    { name_en: "GlucoCheck Test Strips", name_ar: "شرائط اختبار جلوكوتشيك", subtitle_en: "Accurate Glucose Testing", subtitle_ar: "قياس دقيق للسكر", category: "diabetes-care", ingredient: "For GlucoCheck Meters", pack: "50 Strips", price: 75, compare: 89, shape: "box", rating: 4.8, reviews: 830, best: 4 },
    { name_en: "Safety Lancets 30G", name_ar: "إبر وخز آمنة 30G", subtitle_en: "Virtually Painless", subtitle_ar: "شبه خالية من الألم", category: "diabetes-care", ingredient: "Sterile, Single Use", pack: "100 Lancets", price: 22, shape: "box", rating: 4.6, reviews: 310 },
    { name_en: "Digital BP Monitor", name_ar: "جهاز قياس ضغط الدم الرقمي", subtitle_en: "Upper Arm, Large Cuff", subtitle_ar: "للذراع العلوي مع كم كبير", category: "medical-devices", ingredient: "Automatic Blood Pressure Monitor", pack: "1 Device", price: 149, compare: 179, shape: "device", device: "bp", rating: 4.7, reviews: 520 },
    { name_en: "Infrared Thermometer", name_ar: "ميزان حرارة بالأشعة تحت الحمراء", subtitle_en: "Non-Contact, 1-Second", subtitle_ar: "بدون تلامس، خلال ثانية", category: "medical-devices", ingredient: "Forehead Infrared Thermometer", pack: "1 Device", price: 79, shape: "device", device: "thermometer", rating: 4.5, reviews: 470 },
    { name_en: "Fingertip Pulse Oximeter", name_ar: "جهاز قياس الأكسجين بالإصبع", subtitle_en: "SpO2 & Pulse Rate", subtitle_ar: "نسبة الأكسجين ومعدل النبض", category: "medical-devices", ingredient: "OLED Display", pack: "1 Device", price: 69, shape: "device", device: "oximeter", rating: 4.6, reviews: 590 },
    { name_en: "Diabetic Foot Cream", name_ar: "كريم القدم لمرضى السكري", subtitle_en: "Urea 10% Repair", subtitle_ar: "يوريا 10% للإصلاح", category: "diabetes-care", ingredient: "Urea 10%, Allantoin", pack: "100 g", price: 32, shape: "tube", rating: 4.6, reviews: 280 },
    { name_en: "Glucose Tablets", name_ar: "أقراص الجلوكوز", subtitle_en: "Fast Hypo Relief", subtitle_ar: "لعلاج سريع لانخفاض السكر", category: "diabetes-care", ingredient: "Dextrose 4g", pack: "10 Tablets", price: 18, shape: "box", rating: 4.5, reviews: 190 },
    { name_en: "Elastic Crepe Bandage 10cm", name_ar: "رباط ضاغط مرن 10 سم", subtitle_en: "Support & Compression", subtitle_ar: "للدعم والضغط", category: "first-aid", ingredient: "Cotton & Elastane", pack: "1 Roll", price: 9.5, shape: "box", rating: 4.4, reviews: 220 },
    { name_en: "Family First Aid Kit", name_ar: "حقيبة إسعافات أولية للعائلة", subtitle_en: "60 Essential Items", subtitle_ar: "60 قطعة أساسية", category: "first-aid", ingredient: "Bandages, Gauze, Antiseptic & more", pack: "1 Kit", price: 59, shape: "box", wide: true, rating: 4.7, reviews: 340 },
  ],
  "oasis-herbals": [
    { name_en: "Black Seed Oil", name_ar: "زيت الحبة السوداء", subtitle_en: "100% Cold Pressed", subtitle_ar: "معصور على البارد 100%", category: "herbal", ingredient: "Nigella Sativa Oil", pack: "100 ml", price: 35, shape: "bottle", rating: 4.8, reviews: 880 },
    { name_en: "Ashwagandha 600mg", name_ar: "أشواغاندا 600 ملغ", subtitle_en: "Stress & Vitality", subtitle_ar: "لتخفيف التوتر والحيوية", category: "herbal", ingredient: "Withania Somnifera Root Extract", pack: "60 Capsules", price: 55, shape: "jar", rating: 4.6, reviews: 430 },
    { name_en: "Turmeric Curcumin", name_ar: "كركم كوركومين", subtitle_en: "With Black Pepper", subtitle_ar: "مع الفلفل الأسود", category: "herbal", ingredient: "Curcumin 95%, Piperine", pack: "60 Capsules", price: 58, shape: "jar", rating: 4.7, reviews: 520 },
    { name_en: "Ginger & Honey Syrup", name_ar: "شراب الزنجبيل والعسل", subtitle_en: "Soothes Throat", subtitle_ar: "لتهدئة الحلق", category: "herbal", ingredient: "Ginger Extract, Natural Honey", pack: "150 ml", price: 27, shape: "bottle", rating: 4.5, reviews: 310 },
    { name_en: "Moringa Leaf Capsules", name_ar: "كبسولات أوراق المورينجا", subtitle_en: "Natural Superfood", subtitle_ar: "غذاء خارق طبيعي", category: "herbal", ingredient: "Moringa Oleifera 500mg", pack: "90 Capsules", price: 45, shape: "jar", rating: 4.5, reviews: 240 },
    { name_en: "Milk Thistle Liver Support", name_ar: "حليب الشوك لدعم الكبد", subtitle_en: "Silymarin 80%", subtitle_ar: "سيليمارين 80%", category: "herbal", ingredient: "Milk Thistle Extract 250mg", pack: "60 Tablets", price: 49, shape: "jar", rating: 4.6, reviews: 280 },
    { name_en: "Chamomile Sleep Tea", name_ar: "شاي البابونج للنوم", subtitle_en: "Caffeine-Free", subtitle_ar: "خالٍ من الكافيين", category: "herbal", ingredient: "Chamomile, Lemon Balm, Lavender", pack: "20 Tea Bags", price: 18, shape: "box", wide: true, rating: 4.7, reviews: 360 },
    { name_en: "Whey Protein Vanilla", name_ar: "واي بروتين بالفانيليا", subtitle_en: "24g Protein per Serving", subtitle_ar: "24 غرام بروتين لكل حصة", category: "vitamins", ingredient: "Whey Protein Concentrate", pack: "900 g", price: 149, compare: 169, shape: "jar", big: true, rating: 4.7, reviews: 690 },
    { name_en: "Arnica Pain Relief Gel", name_ar: "جل الأرنيكا لتخفيف الألم", subtitle_en: "Muscles & Bruises", subtitle_ar: "للعضلات والكدمات", category: "herbal", ingredient: "Arnica Montana Extract", pack: "75 g", price: 29, shape: "tube", rating: 4.5, reviews: 270 },
    { name_en: "Sidr Honey", name_ar: "عسل السدر", subtitle_en: "Pure Natural Honey", subtitle_ar: "عسل طبيعي نقي", category: "herbal", ingredient: "100% Sidr Honey", pack: "250 g", price: 89, shape: "jar", honey: true, rating: 4.9, reviews: 610 },
  ],
};

export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function productSlug(company, p) {
  return slugify(`${company.short} ${p.name_en}`);
}
