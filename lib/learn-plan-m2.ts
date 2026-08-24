/**
 * Lernplan für das Zweite Staatsexamen (M2), Durchgang Herbst 2026.
 *
 * Statische Referenzdaten: bewusst im Code und nicht in der Datenbank, weil
 * der Plan sich pro Durchgang ändert, versioniert werden soll und ohne
 * Migration auskommen muss.
 *
 * Die Einträge sind Themenbezeichnungen (Fachbegriffe/Krankheitsbilder). Nicht
 * jeder Eintrag eignet sich zur Fragengenerierung — Handbuch-, Wiederholungs-
 * und Sammelsurium-Einträge sind Navigationshilfen ohne klar abgrenzbaren
 * Lernstoff. Diese werden über `isGeneratableTopic` von der Zufallsauswahl
 * ausgenommen, bleiben in der Anzeige aber sichtbar, damit der Plan
 * vollständig abgebildet ist.
 */

export type LearnPlanDay = {
  day: number
  /** Fachgebiet(e) des Tages, wie im Plan ausgewiesen. */
  subject: string
  topics: string[]
}

export const LEARN_PLAN_LABEL = "M2-Lernplan · Herbst 2026"

/**
 * Einträge, die keine generierbaren Fachthemen sind (Meta-/Navigationsposten).
 * "Sammelsurium"-Einträge sind bewusst ausgenommen: Sie bündeln Restwissen
 * ohne klaren Fokus und führen zu beliebigen Fragen.
 */
const NON_TOPIC_PATTERNS: readonly RegExp[] = [
  /^Handbuch\b/i,
  /^Kreuztipps\b/i,
  /^Sammelsurium\b/i,
  /M2-Lernplan/i,
  /^Zweites Staatsexamen$/i,
  /^Tag \d+/i,
]

export function isGeneratableTopic(topic: string): boolean {
  const t = topic.trim()
  if (t.length < 3) return false
  return !NON_TOPIC_PATTERNS.some((re) => re.test(t))
}

export const LEARN_PLAN_M2: readonly LearnPlanDay[] = [
  { day: 1, subject: "Kardiologie und Angiologie", topics: ["Handbuch – Vorbereitung auf das Zweite Staatsexamen", "Kreuztipps zum Zweiten Staatsexamen", "Untersuchungsmethoden in der Kardiologie", "EKG", "Herzrhythmusstörungen", "Supraventrikuläre Extrasystolen", "Vorhofflimmern", "Sick-Sinus-Syndrom", "AV-Block", "AV-Knoten-Reentrytachykardie", "Atrioventrikuläre Reentrytachykardie"] },
  { day: 2, subject: "Kardiologie und Angiologie", topics: ["Ventrikuläre Extrasystolen", "Ventrikuläre Tachykardie", "Kammerflattern und -flimmern", "Herzschrittmacher", "Synkope", "Subclavian-Steal-Syndrom"] },
  { day: 3, subject: "Kardiologie und Angiologie", topics: ["Dyslipidämien", "Atherosklerose und kardiovaskuläre Prävention", "Koronare Herzkrankheit", "Thoraxschmerz", "Akutes Koronarsyndrom", "Myokardinfarkt", "Herzkatheteruntersuchung"] },
  { day: 4, subject: "Kardiologie und Angiologie", topics: ["Herzinsuffizienz", "Kardiomyopathien", "Dilatative Kardiomyopathie", "Hypertrophe Kardiomyopathie", "Herzklappenerkrankungen", "Aortenklappenstenose", "Aortenklappeninsuffizienz", "Mitralklappenstenose", "Mitralklappeninsuffizienz"] },
  { day: 5, subject: "Kardiologie und Angiologie", topics: ["Infektiöse Endokarditis", "Rheumatisches Fieber", "Myokarditis", "Perikarditis", "Coxsackievirus-Infektionen", "Perikarderguss und Perikardtamponade"] },
  { day: 6, subject: "Kardiologie und Angiologie", topics: ["Arterielle Hypertonie", "Pulmonale Hypertonie", "Varikosis und chronisch-venöse Insuffizienz", "Phlebothrombose", "Lungenembolie"] },
  { day: 7, subject: "Angiologie & Hämatologie", topics: ["Periphere arterielle Verschlusskrankheit", "Erythrozytenmorphologie und Hämoglobinvarianten", "Anämie", "Eisenmangel", "Hämolytische Anämie", "Kugelzellanämie", "Glucose-6-phosphat-Dehydrogenase-Mangel", "Sichelzellkrankheit", "Thalassämie", "Myelodysplastische Syndrome"] },
  { day: 8, subject: "Hämatologie", topics: ["Akute Leukämien", "Myeloproliferative Neoplasien", "Chronische myeloische Leukämie", "Polycythaemia vera", "Hodgkin-Lymphom", "Non-Hodgkin-Lymphome", "Multiples Myelom", "Chronische lymphatische Leukämie", "MALT-Lymphom", "Kutane Lymphome"] },
  { day: 9, subject: "Hämatologie", topics: ["Blutgerinnung und hämorrhagische Diathesen", "Von-Willebrand-Syndrom", "Hämophilie", "Antiphospholipid-Syndrom", "Thrombozytopenien", "Thrombotische Mikroangiopathie", "Splenomegalie", "Asplenie und Hyposplenismus"] },
  { day: 10, subject: "Pneumologie", topics: ["Klinische Untersuchung der Lunge", "Lungenfunktionsuntersuchung", "Akute Bronchitis", "Pneumonie", "Ambulant erworbene Pneumonie", "Nosokomiale Pneumonie", "Akute unkomplizierte Atemwegsinfektionen", "Legionellose", "Pneumocystis-jirovecii-Pneumonie", "Tuberkulose", "Sarkoidose"] },
  { day: 11, subject: "Pneumologie", topics: ["Lungenkarzinom", "Pleuraerguss", "Atelektase", "Asthma bronchiale", "Chronisch-obstruktive Lungenerkrankung", "Interstitielle Lungenparenchymerkrankungen", "Exogen-allergische Alveolitis", "Schlafbezogene Atmungsstörungen", "Husten"] },
  { day: 12, subject: "Gastroenterologie", topics: ["Achalasie", "Gastrointestinale Blutung", "Mallory-Weiss-Syndrom", "Gastroösophageale Refluxkrankheit", "Gastroduodenale Ulkuskrankheit", "Chronische Gastritis", "Malassimilation", "Zöliakie", "Lactoseintoleranz"] },
  { day: 13, subject: "Gastroenterologie", topics: ["Morbus Crohn", "Colitis ulcerosa", "Divertikulose, Divertikelkrankheit und Divertikulitis", "Reizdarmsyndrom", "Gutartige Leberraumforderungen", "Leberabszess"] },
  { day: 14, subject: "Gastroenterologie", topics: ["Hepatitis A", "Hepatitis B und HBV-Infektion", "Hepatitis C und HCV-Infektion", "Alkoholtoxischer Leberschaden", "Autoimmunhepatitis", "Primär biliäre Cholangitis", "Primär sklerosierende Cholangitis", "Morbus Wilson", "Hämochromatose", "Leberzirrhose", "Portale Hypertension"] },
  { day: 15, subject: "Gastroenterologie", topics: ["Ikterus und Cholestase", "Akute Pankreatitis", "Chronische Pankreatitis", "Pankreaskarzinom", "Aszites"] },
  { day: 16, subject: "Endokrinologie und Stoffwechsel", topics: ["Hypophysenvorderlappeninsuffizienz", "Prolaktinom", "Akromegalie", "Nebennierenrindeninsuffizienz", "Primärer Hyperaldosteronismus", "Cushing-Syndrom", "Phäochromozytom", "Multiple endokrine Neoplasie"] },
  { day: 17, subject: "Endokrinologie und Stoffwechsel", topics: ["Struma", "Anti-Schilddrüsen-Antikörper", "Hyperthyreose", "Hypothyreose", "Hashimoto-Thyreoiditis", "Thyreoiditis de Quervain", "Hyperparathyreoidismus"] },
  { day: 18, subject: "Endokrinologie und Stoffwechsel", topics: ["Metabolisches Syndrom", "Diabetes mellitus", "Hyperglykämisches Koma", "Hypoglykämie"] },
  { day: 19, subject: "Nephrologie", topics: ["Diagnostik von Erkrankungen der Niere und der ableitenden Harnwege", "Dehydratation", "Ödeme", "Elektrolytstörungen Natrium", "Elektrolytstörungen Kalium", "Elektrolytstörungen Calcium", "Akute Nierenfunktionseinschränkung", "Chronische Nierenkrankheit", "Transplantation"] },
  { day: 20, subject: "Nephrologie", topics: ["Vasopressin-assoziierte Erkrankungen (Diabetes insipidus)", "Syndrom der inadäquaten ADH-Sekretion", "Grundlagen nephrologischer Krankheitsbilder", "Infektassoziierte Glomerulonephritiden", "Rapid-progressive Glomerulonephritis", "Nephrotisches Syndrom", "IgA-Nephropathie", "Renale tubuläre Partialfunktionsstörungen", "Proteinurie", "Nierenersatzverfahren"] },
  { day: 21, subject: "Rheumatologie", topics: ["Immunsystem", "Fieber und Entzündungsreaktionen", "Allergische Erkrankungen", "Kontaktekzem", "Anaphylaxie", "Raynaud-Syndrom", "Fibromyalgiesyndrom"] },
  { day: 22, subject: "Rheumatologie", topics: ["Rheumatoide Arthritis", "Axiale Spondylarthritis", "Reaktive Arthritis", "Psoriasis-Arthritis", "Hyperurikämie und Gicht"] },
  { day: 23, subject: "Rheumatologie", topics: ["Kollagenosen", "Lupus erythematodes", "Polymyositis und Dermatomyositis", "Systemische Sklerose", "Vaskulitiden", "Riesenzellarteriitis", "Polymyalgia rheumatica", "Granulomatose mit Polyangiitis", "Kawasaki-Syndrom", "Thrombangiitis obliterans", "Rheumatologische Antikörperdiagnostik"] },
  { day: 24, subject: "Infektiologie und Hygiene", topics: ["Mikrobiologische Untersuchungen", "Blutkulturen", "Sepsis", "Durchfall", "Lebensmittelvergiftung", "Norovirus-Infektion", "Rotavirus-Infektion", "Bakterielle Durchfallerkrankungen", "Darmpathogene E.-coli-Infektion", "Clostridioides-difficile-Infektion", "Amöbiasis", "Giardiasis"] },
  { day: 25, subject: "Infektiologie und Hygiene", topics: ["Erkrankungen durch Staphylokokken", "Erkrankungen durch Streptokokken", "Toxische Schocksyndrome", "Chlamydien-Infektionen", "Lyme-Borreliose", "Brucellose", "Typhus, Paratyphus", "Milzbrand", "Leptospirose", "Diphtherie", "Listeriose", "Katzenkratzkrankheit"] },
  { day: 26, subject: "Infektiologie und Hygiene", topics: ["COVID-19", "Influenza", "Herpesvirus-Infektionen", "Zytomegalievirus-Infektionen", "Infektiöse Mononukleose", "HIV-Infektion", "Virales hämorrhagisches Fieber", "Gelbfieber", "Denguefieber", "Zika-Virus-Infektion", "Mpox", "Tollwut"] },
  { day: 27, subject: "Infektiologie und Hygiene", topics: ["Aspergillose", "Malaria", "Toxoplasmose", "Leishmaniose", "Chagas-Krankheit", "Schlafkrankheit", "Wurmerkrankungen", "Echinokokkose", "Schistosomiasis", "Lepra", "Seltene Zoonosen"] },
  { day: 28, subject: "Infektiologie und Hygiene", topics: ["Antisepsis", "Nosokomiale Infektionen", "Lymphknotenschwellung", "Impfungen allgemein", "Impfempfehlungen der STIKO", "Infektionsschutzgesetz", "Wasserhygiene"] },
  { day: 29, subject: "Pädiatrie", topics: ["Das neugeborene Kind", "Geburtstraumen", "Perinatale Asphyxie und hypoxisch-ischämische Enzephalopathie", "Zerebralparese", "Neugeboreneninfektion", "Omphalitis", "Atemnotsyndrom des Neugeborenen", "Embryofetopathien durch Noxen", "Embryofetopathien durch Infektionserreger", "Plötzlicher Säuglingstod", "Kinderschutzmedizin"] },
  { day: 30, subject: "Pädiatrie", topics: ["Icterus neonatorum", "Morbus haemolyticus neonatorum", "Morbus haemorrhagicus neonatorum", "Hyperbilirubinämie-Syndrome", "Nahrungsmittelallergie", "Entwicklung des Kindes", "Kindervorsorgeuntersuchungen", "Enuresis und funktionelle Harninkontinenz im Kindes- und Jugendalter", "Kleinwuchs", "Großwuchs", "Pubertät"] },
  { day: 31, subject: "Pädiatrie", topics: ["Neuroblastom", "Nephroblastom", "Retinoblastom", "Lippen-Kiefer-Gaumen-Spalte", "Zystische Fibrose", "Adrenogenitales Syndrom", "Seltene hereditäre Syndrome", "Hereditäre Stoffwechselerkrankungen", "Hereditäre Störungen des Aminosäurestoffwechsels", "Hereditäre Störungen des Kohlenhydratstoffwechsels", "Hereditäre Störungen des Fettsäurestoffwechsels", "Hereditäre Störungen im Abbau komplexer Moleküle"] },
  { day: 32, subject: "Pädiatrie", topics: ["Atopische Dermatitis", "Windeldermatitis", "Masern", "Scharlach", "Röteln", "Ringelröteln", "Exanthema subitum", "Windpocken", "IgA-Vaskulitis", "Mumps", "Pertussis", "Poliomyelitis", "Fieberkrampf"] },
  { day: 33, subject: "Pädiatrie", topics: ["Akute Bronchiolitis im Säuglingsalter", "Pseudokrupp", "Epiglottitis", "Fremdkörperaspiration", "Azyanotische angeborene Herzfehler", "Ventrikelseptumdefekt", "Atriumseptumdefekt", "Zyanotische angeborene Herzfehler", "Fallot-Tetralogie", "Choanalatresie", "Ösophagusatresie", "Hypertrophe Pylorusstenose", "Duodenalatresie", "Morbus Hirschsprung", "Viszerale Fehlbildungen", "Nekrotisierende Enterokolitis", "Darminvagination"] },
  { day: 34, subject: "Pädiatrie", topics: ["Hüftreifungsstörung (Developmental Dysplasia of the Hip)", "Morbus Perthes", "Epiphyseolysis capitis femoris", "Juvenile idiopathische Arthritis", "Morbus Scheuermann", "Kraniosynostosen", "Hydrozephalus", "Fehlbildungen des kraniozervikalen Übergangs", "Neuralrohrdefekte"] },
  { day: 35, subject: "Humangenetik", topics: ["Humangenetik (Klinik)", "Chromosomenaberrationen", "Trisomie 21", "Ehlers-Danlos-Syndrom und Marfan-Syndrom"] },
  { day: 36, subject: "Dermatologie", topics: ["Grundlagen der Dermatologie", "Herpes zoster", "Molluscum contagiosum", "Impetigo contagiosa", "Staphylococcal scalded Skin Syndrome", "Intertriginöse Dermatosen", "Allgemeine Mykologie", "Dermatophytosen", "Onychomykose", "Kandidosen", "Pityriasis versicolor", "Skabies", "Lauserkrankungen", "Fotodermatosen", "Porphyrien", "Angioödem", "Urtikaria"] },
  { day: 37, subject: "Dermatologie", topics: ["Erythema nodosum", "Erythema exsudativum multiforme", "Epidermale Nekrolyse", "Blasenbildende Autoimmundermatosen", "Psoriasis vulgaris", "Lichen ruber planus", "Ichthyosen", "Pityriasis rosea", "Seborrhoisches Ekzem", "Acne vulgaris", "Rosazea", "Granulomatöse Hauterkrankungen"] },
  { day: 38, subject: "Dermatologie", topics: ["Benigne Hauttumoren", "Aktinische Keratose", "Malignes Melanom", "Plattenepithelkarzinom der Haut", "Basalzellkarzinom", "Parapsoriasis en plaques", "Vitiligo", "Alopezien", "Sexuell übertragbare Infektionen", "Gonorrhö", "Syphilis", "Ulcus molle", "Sammelsurium der Dermatologie", "Periorale Dermatitis"] },
  { day: 39, subject: "Anästhesie", topics: ["Lokalanästhetika", "Regionalanästhesie", "Allgemeinanästhesie", "Maschinelle Beatmung", "Rapid Sequence Induction", "Inhalationsanästhetika", "Injektionsanästhetika", "Muskelrelaxanzien", "Benzodiazepine", "Maligne Hyperthermie"] },
  { day: 40, subject: "Intensiv- und Notfallmedizin", topics: ["Grundlagen der Schmerztherapie", "Nicht-Opioid-Analgetika", "Opioide", "Pulsoxymetrie und Blutgasanalyse", "Flüssigkeits- und Volumentherapie", "Künstliche Ernährung", "Transfusionen", "Präklinische Traumaversorgung", "Grundlagen der Reanimation", "Reanimation", "Polytrauma"] },
  { day: 41, subject: "Intensiv- und Notfallmedizin", topics: ["Schock", "Acute Respiratory Distress Syndrome", "Rhabdomyolyse und Crush-Syndrom", "Verbrennung", "Hypothermie und Erfrierungen", "Thoraxtrauma", "Pneumothorax", "Intoxikation mit Kohlenstoffmonoxid oder -dioxid"] },
  { day: 42, subject: "Chirurgie", topics: ["Akute Wunden und Wundverschluss", "Chronische Wunden und Wundbehandlung", "Bakterielle Infektionen von Haut und Weichgewebe", "Paronychie und Panaritium", "Tetanus", "Aktinomykose", "Perioperatives Management", "Laparoskopische Chirurgie", "Koronararterielle Bypasschirurgie", "Aneurysma", "Aortenaneurysma", "Aortendissektion", "Akuter arterieller Extremitätenverschluss"] },
  { day: 43, subject: "Viszeralchirurgie", topics: ["Schilddrüsenkarzinom", "Schilddrüsenchirurgie", "Ösophagusdivertikel", "Boerhaave-Syndrom", "Ösophaguskarzinom", "Zwerchfellhernie", "Milzruptur", "Magenkarzinom", "Neuroendokrine Neoplasien", "Akutes Abdomen", "Peritonitis", "Ileus"] },
  { day: 44, subject: "Viszeralchirurgie", topics: ["Mesenteriale Ischämie", "Appendizitis", "Kolonpolypen", "Kolorektales Karzinom", "Hereditäres, nicht-polypöses Kolonkarzinom", "Obstipation", "Darmchirurgie"] },
  { day: 45, subject: "Viszeralchirurgie", topics: ["Cholelithiasis, Cholezystitis und Cholangitis", "Biliäre Karzinome", "Hepatozelluläres Karzinom", "Pankreas- und Leberchirurgie", "Anal- und Rektumprolaps", "Hämorrhoiden und Hämorrhoidalleiden", "Analvenenthrombose", "Analfissur", "Analabszess und Analfistel", "Analkarzinom", "Sinus pilonidalis", "Hernien", "Leistenhernie", "Schenkelhernie"] },
  { day: 46, subject: "Unfallchirurgie", topics: ["Allgemeine Frakturlehre", "Konservative Verfahren in der Frakturversorgung", "Operative Verfahren der Unfallchirurgie/Orthopädie", "Frakturen im Kindesalter", "Kompartmentsyndrom", "Claviculafraktur", "Luxation des Akromioklavikulargelenks", "Humerusfraktur", "Distale Radiusfraktur", "Schaftfrakturen des Unterarmes"] },
  { day: 47, subject: "Unfallchirurgie", topics: ["Kahnbeinfraktur", "Mittelhandfrakturen", "Wirbelsäulenverletzungen", "Beckenringfrakturen", "Proximale Femurfrakturen", "Femurschaft- und distale Femurfrakturen", "Frakturen des Unterschenkels", "Sprunggelenksfraktur"] },
  { day: 48, subject: "Orthopädie", topics: ["Orthopädische Untersuchungszeichen", "Arthrose", "Osteomalazie und Rachitis", "Osteodystrophia deformans", "Osteoporose", "Laborkonstellation Knochenerkrankungen", "Seronegative Spondylarthritis", "Osteomyelitis", "Spondylodiszitis", "Bakterielle Arthritis"] },
  { day: 49, subject: "Orthopädie", topics: ["Benigne Knochen- und Knorpeltumoren", "Maligne Knochen- und Knorpeltumoren", "Spondylolisthese", "Bandscheibenprolaps", "Adoleszente idiopathische Skoliose", "Rückenschmerzen"] },
  { day: 50, subject: "Orthopädie", topics: ["Morbus Dupuytren", "Tendovaginitis", "Tendinopathie", "Komplexes regionales Schmerzsyndrom", "Thoracic-Outlet-Syndrom", "Schulterläsionen", "Rotatorenmanschettenruptur", "Schultergelenkluxation", "Bizepssehnenruptur", "Luxationen des Ellenbogengelenks", "Radiuskopf-Subluxation", "Karpaltunnelsyndrom", "Sehnenverletzung der Hand", "Sammelsurium der Unfallchirurgie und Orthopädie"] },
  { day: 51, subject: "Orthopädie", topics: ["Osteochondrosis dissecans", "Osteonekrosen", "Aseptische Femurkopfnekrose im Erwachsenenalter", "Fehlstellungen der unteren Extremität", "Koxarthrose", "Gonarthrose", "Sportverletzungen", "Meniskusruptur", "Patellaluxation", "Bandverletzungen des Knies", "Achillessehnenruptur", "Fußdeformitäten", "Zehendeformitäten"] },
  { day: 52, subject: "Gynäkologie und Geburtshilfe", topics: ["Diagnostik in der Gynäkologie", "Fehlbildungen der weiblichen Geschlechtsorgane", "Androgenresistenz", "Östrogenwirkung und assoziierte Erkrankungen", "Menstruationszyklus und Zyklusanomalien", "Endometriose", "Polyzystisches Ovarialsyndrom", "Klimakterium", "Entzündungen des weiblichen Genitaltrakts", "Entzündliche und benigne Veränderungen der Mamma"] },
  { day: 53, subject: "Gynäkologie und Geburtshilfe", topics: ["Mammakarzinom", "Uterusmyom", "Benigne Ovarialtumoren", "Maligne Ovarialtumoren"] },
  { day: 54, subject: "Gynäkologie und Geburtshilfe", topics: ["Infektion mit humanen Papillomaviren", "Zervixkarzinom", "Endometriumkarzinom", "Vulvakarzinom"] },
  { day: 55, subject: "Gynäkologie und Geburtshilfe", topics: ["Schwangerschaftsabbruch", "Sterilität, Infertilität und Impotenz", "Nicht-hormonelle Kontrazeption", "Schwangerschaft", "Vorsorgeuntersuchungen in der Schwangerschaft", "Pränataldiagnostik", "Kardiotokografie (CTG)", "Mehrlingsschwangerschaft", "Extrauteringravidität", "Fruchtwasseranomalien"] },
  { day: 56, subject: "Gynäkologie und Geburtshilfe", topics: ["Hypertensive Schwangerschaftserkrankungen", "HELLP-Syndrom", "Blutungen während der Schwangerschaft", "Intra- und postpartale Blutungen", "Fetale Wachstumsrestriktion", "Vorzeitige Plazentalösung", "Placenta praevia", "Nabelschnurkomplikationen", "Trophoblasttumoren", "Geburtsablauf", "Geburtsmechanik", "Geburtseinleitung", "Operative Geburtshilfe", "Drohende Frühgeburt", "Abort und intrauteriner Fruchttod", "Uterusruptur", "Wochenbett"] },
  { day: 57, subject: "Urologie", topics: ["Apparative Diagnostik in der Urologie", "Kongenitale Anomalien der Nieren und ableitenden Harnwege", "Polyzystische Nierenerkrankung", "Blasenekstrophie, Fehlanlagen der männlichen Harnröhre und Palmure", "Balanitis und Balanoposthitis", "Phimose", "Hodenhochstand", "Harninkontinenz", "Belastungsinkontinenz", "Dranginkontinenz", "Harnverhalt", "Harnabflussstörungen", "Vesikoureteraler Reflux", "Morbus Ormond", "Urozystitis", "Urethritis", "Pyelonephritis", "Perinephritischer Abszess", "Prostatitis", "Epididymitis und Orchitis", "Hydrocele testis, Varikozele und Spermatozele", "Skrotalabszess"] },
  { day: 58, subject: "Urologie", topics: ["Nierenzellkarzinom", "Benignes Prostatasyndrom", "Prostatakarzinom", "Urothelkarzinom", "Maligne Hodentumoren", "Peniskarzinom", "Urolithiasis", "Traumatische Verletzungen der Niere und der ableitenden Harnwege", "Hodentorsion", "Priapismus", "Penisruptur", "Sexuelle Funktionsstörungen", "Spermiogramm"] },
  { day: 59, subject: "HNO", topics: ["Audiometrische Verfahren in der HNO", "Othämatom und Otserom", "Otitis externa", "Akute Otitis media", "Mastoiditis und Labyrinthitis", "Tubenfunktionsstörungen", "Otosklerose", "Chronische Otitis media", "Glomustumor", "Hörsturz", "Akustisches Trauma", "Tinnitus", "Peripherer paroxysmaler Lagerungsschwindel", "Morbus Menière", "Neuropathia vestibularis", "Epistaxis", "Tumoren der Nasenhaupthöhle und Nasennebenhöhlen", "Sinusitis", "Allergische Rhinitis", "Gesichts- und Felsenbeinfrakturen"] },
  { day: 60, subject: "HNO", topics: ["Adenoide Vegetationen", "Juveniles Angiofibrom", "Zungenveränderungen", "Akute bakterielle Tonsillopharyngitis", "Peritonsillar-, Parapharyngeal- und Retropharyngealabszess", "Pharynxkarzinom", "Kehlkopflähmung", "Benigne Tumoren und Präkanzerosen des Larynx", "Larynxkarzinom", "Halszyste und Halsfistel", "Kopfspeicheldrüsenerkrankungen", "Sjögren-Syndrom", "Sprach- und Sprechentwicklungsstörungen", "Sammelsurium der HNO"] },
  { day: 61, subject: "Augenheilkunde", topics: ["Untersuchungsmethoden in der Augenheilkunde", "Störungen der Lidstellung", "Entzündungen der Augenlider", "Erkrankungen des Tränenapparats", "Infektiöse Konjunktivitis", "Nicht-infektiöse Konjunktivitis", "Allergische Konjunktivitiden", "Degenerationen, Dystrophien und Tumoren der Konjunktiven", "Erkrankungen der Hornhaut", "Keratitis", "Entzündungen der Sklera", "Erkrankungen der Linse", "Katarakt", "Erkrankungen der Uvea", "Aderhautmelanom"] },
  { day: 62, subject: "Augenheilkunde", topics: ["Pupillenstörungen", "Sehstörungen", "Erkrankungen des Glaskörpers", "Endophthalmitis", "Glaukom", "Erkrankungen der Netzhaut", "Retinale Gefäßverschlüsse", "Netzhautablösung", "Altersbedingte Makuladegeneration", "Störungen der Sehbahn", "Erkrankungen der Augenhöhle", "Horner-Syndrom", "Störungen der Optik", "Störungen der Bulbusmotilität und Strabismus", "Traumatische Augenverletzungen"] },
  { day: 63, subject: "Neurologie", topics: ["Neurologische Untersuchung", "Tremor", "Parkinson-Syndrom und Parkinson-Krankheit", "Atypische Parkinson-Syndrome", "Normaldruckhydrozephalus", "Huntington-Erkrankung", "Restless-Legs-Syndrom", "Grundlagen der Kleinhirnerkrankungen", "Friedreich-Ataxie"] },
  { day: 64, subject: "Neurologie", topics: ["Epileptische Anfälle", "Status epilepticus", "Epilepsien und Epilepsiesyndrome", "Transiente globale Amnesie", "Narkolepsie", "Vigilanzminderung", "Irreversibler Hirnfunktionsausfall", "Syndrome mit anhaltender minimaler Interaktionsfähigkeit", "Intrakranielle Druckerhöhung", "Schädel-Hirn-Trauma"] },
  { day: 65, subject: "Neurologie", topics: ["Intrazerebrale Blutung", "Epidurales Hämatom", "Subdurales Hämatom", "Subarachnoidalblutung", "Ischämischer Schlaganfall", "Karotis- und Vertebralisdissektion", "Zerebrale Sinus- und Venenthrombose", "Carotis-Sinus-cavernosus-Fistel"] },
  { day: 66, subject: "Neurologie", topics: ["Kopfschmerzen", "Migräne", "Kopfschmerz vom Spannungstyp", "Cluster-Kopfschmerz", "Trigeminusneuralgie", "Kopfschmerz bei Medikamentenübergebrauch", "Idiopathische intrakranielle Hypertension", "Meningitis", "Liquorpunktion", "FSME-Virus-Infektion", "Herpes-simplex-Enzephalitis", "Hirnabszess", "Creutzfeldt-Jakob-Krankheit"] },
  { day: 67, subject: "Neurologie", topics: ["Multiple Sklerose", "Neuromyelitis-optica-Spektrum-Erkrankungen", "Amyotrophe Lateralsklerose", "Spinale Muskelatrophien", "Myasthenia gravis", "Myotone Dystrophien und nicht-dystrophe Myotonien", "Progressive Muskeldystrophien", "Stiff-Person-Syndrom", "Dystonie", "Hereditäre spastische Paraplegie"] },
  { day: 68, subject: "Neurologie", topics: ["Tumoren des zentralen Nervensystems", "Gliome", "Meningeom", "Vestibularisschwannom und andere Neurinome", "Meningeosis neoplastica", "Hirnnerven-Syndrome", "Periphere Fazialisparese", "Syndrome der Schädelbasis", "Komplettes Querschnittsyndrom", "Inkomplette Querschnittsyndrome", "Arteria-spinalis-anterior-Syndrom", "Zervikale Myelopathie", "Degenerative Spinalkanalstenose"] },
  { day: 69, subject: "Neurologie", topics: ["Neurophysiologische Diagnostik", "Periphere Nervenläsionen", "Läsion des N. radialis", "Läsion des N. ulnaris", "Läsion des N. medianus", "Neuralgische Amyotrophie", "Polyneuropathie", "Guillain-Barré-Syndrom", "Vitamin-B12-Mangel"] },
  { day: 70, subject: "Psychiatrie", topics: ["Psychopathologischer Befund", "Psychotherapeutische Verfahren (Klinik)", "Delir", "Demenzen", "Alzheimer-Krankheit", "Frontotemporale Demenz", "Vaskuläre Demenz", "Somatoforme Störungen", "Unipolare Depression", "Bipolare affektive Störung", "Neuromodulationsverfahren"] },
  { day: 71, subject: "Psychiatrie", topics: ["Zwangsstörungen", "Reaktionen auf schwere Belastungen und Anpassungsstörungen", "Dissoziative Störungen", "Opioidbezogene Störungen", "Cannabinoide", "Sedativa (Intoxikation und Abhängigkeit)", "Rauchen und Tabakkonsum", "Psychostimulanzien", "Alkoholbezogene Störungen", "Wernicke-Enzephalopathie", "Schizophrenie"] },
  { day: 72, subject: "Psychiatrie", topics: ["Persönlichkeitsstörungen", "Borderline-Persönlichkeitsstörung", "Tiefgreifende Entwicklungsstörungen", "Tic-Störungen", "Essstörungen", "Angststörungen", "Insomnien", "Parasomnien"] },
  { day: 73, subject: "Psychiatrie", topics: ["Verhaltens- und emotionale Störungen im Kindes- und Jugendalter", "Aufmerksamkeitsdefizit-/Hyperaktivitätsstörung", "Geschlechtsinkongruenz", "Paraphile Störungen", "Suizidalität", "Betreuung und Zwangsmaßnahmen"] },
  { day: 74, subject: "Pharmakologie", topics: ["Pharmakologische Grundlagen", "Arzneimittelrezept", "Parasympathomimetika", "Parasympatholytika", "Anticholinerges Syndrom", "β2-Sympathomimetika", "Sympathomimetika", "Antisympathotonika", "Betablocker", "Calciumantagonisten", "RAAS-Inhibitoren"] },
  { day: 75, subject: "Pharmakologie", topics: ["Amiodaron", "Nitrate und Molsidomin", "Phosphodiesterase-Hemmer", "Herzglykoside", "Thrombozytenaggregationshemmer", "Parenterale Antikoagulanzien", "Orale Antikoagulanzien", "Diuretika", "Thiaziddiuretika", "Schleifendiuretika", "Kaliumsparende Diuretika", "Überblick über Vergiftungen"] },
  { day: 76, subject: "Pharmakologie", topics: ["Antihistaminika", "Glucocorticoide", "Protonenpumpenhemmer", "Lipidsenker", "Antidiabetika", "Insuline", "Bisphosphonate und andere antiosteoporotische Medikamente", "Thyreostatika", "Hormonelle Kontrazeption", "Pharmakotherapie in der Schwangerschaft"] },
  { day: 77, subject: "Pharmakologie", topics: ["Antipsychotika", "Antidepressiva", "Lithium", "Anfallssuppressiva", "Parkinson-Medikamente"] },
  { day: 78, subject: "Pharmakologie", topics: ["Antibiotika", "Virostatika", "Interferontherapie", "Antimykotika", "Immunsuppressiva", "Chloroquin und Hydroxychloroquin", "Zytostatika", "Medikamente der zielgerichteten Tumortherapie", "Antiemetika"] },
  { day: 79, subject: "Radiologie", topics: ["Röntgen", "Computertomografie", "Magnetresonanztomografie", "Strahlentherapie", "Radioiodtherapie", "Schilddrüsenszintigrafie", "Knochenszintigrafie", "Ösophagusbreischluck und Störungen der Ösophagusmotilität", "Tag 79 M2-Lernplan – Wiederholung des Querschnittbereichs Radiologie"] },
  { day: 80, subject: "Arbeits- und Umweltmedizin", topics: ["Arbeitsmedizinische Organe und Gesetze", "Verhütung und Früherkennung beruflich bedingter Schäden", "Anerkennung von Berufskrankheiten", "Messkriterien der Arbeitsplatzbelastung", "Berufskrankheiten durch physikalische Belastungen", "Erkrankungen durch Metalle", "Erkrankungen durch organische Lösungsmittel, Insektizide, Halogenkohlenwasserstoffe, Benzol und Homologe", "Lungenerkrankungen durch Inhalation anorganischer Stäube", "Asbestose und Mesotheliom", "Silikose", "Lungenerkrankungen durch Inhalation organischer Stäube", "Erkrankungen durch Einwirkung reizender Gase", "Berufserkrankungen der Haut", "Erkrankungen durch chlorierte und polyzyklische aromatische Kohlenwasserstoffe"] },
  { day: 81, subject: "Rechtsmedizin", topics: ["Ärztliche Rechtskunde", "Thanatologie", "Verletzungen und Gewalteinwirkung"] },
  { day: 82, subject: "Rechtsmedizin", topics: ["Strangulation und Ersticken", "Ertrinken", "Zeichen thermischer Schädigungen", "Schussverletzungen", "Spurensicherung", "Artifizielle Störungen"] },
  { day: 83, subject: "Pathologie", topics: ["Zelluläre Veränderungen und Anpassungsreaktionen", "Untersuchungsmethoden in der Pathologie", "Allgemeine Onkologie", "Tumormarker", "Neurokutane Syndrome", "Paraneoplastische Syndrome", "Systemische Amyloidose"] },
  { day: 84, subject: "Epidemiologie", topics: ["Grundbegriffe medizinischer Forschung", "Angewandte Statistik", "Epidemiologie und Wahrscheinlichkeiten", "Studientypen der medizinischen Forschung", "Sammelsurium der Epidemiologie", "Diagnose- und Klassifikationssysteme", "Qualitätsmanagement", "Prävention"] },
  { day: 85, subject: "Sozialmedizin, Rehabilitation & Alternative Heilverfahren", topics: ["Soziale Sicherung", "Gesetzliche Unfallversicherung", "Gesetzliche Krankenversicherung", "Ökonomische Aspekte von Gesundheit und Krankheit", "Behinderung und Einschränkung der Arbeitsfähigkeit", "Grundlagen der allgemeinmedizinischen Versorgung", "Übersicht Geriatrie", "Palliativmedizin", "Rehabilitation", "Physikalische Therapie", "Phytotherapeutika", "Komplementärmedizin einschließlich Naturheilkunde", "Ernährungsmedizin", "Zweites Staatsexamen"] },
]

export const LEARN_PLAN_FIRST_DAY = 1
export const LEARN_PLAN_LAST_DAY = LEARN_PLAN_M2.length

/** Tag aus dem Plan holen. `null`, wenn die Nummer außerhalb liegt. */
export function getLearnPlanDay(day: number): LearnPlanDay | null {
  if (!Number.isInteger(day)) return null
  return LEARN_PLAN_M2.find((d) => d.day === day) ?? null
}

/** Nur die Themen eines Tages, die sich zur Fragengenerierung eignen. */
export function generatableTopics(day: number): string[] {
  return getLearnPlanDay(day)?.topics.filter(isGeneratableTopic) ?? []
}

/**
 * Wählt zufällig ein Thema des Tages. `rand` ist injizierbar, damit die
 * Auswahl in Tests deterministisch ist.
 */
export function pickRandomTopic(
  day: number,
  rand: () => number = Math.random
): string | null {
  const topics = generatableTopics(day)
  if (topics.length === 0) return null
  const idx = Math.min(topics.length - 1, Math.floor(rand() * topics.length))
  return topics[idx]
}
