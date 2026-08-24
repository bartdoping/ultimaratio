import type { LearnPlanDay } from "@/lib/learn-plans"

/**
 * Lernplan für das Erste Staatsexamen (Physikum), Durchgang Herbst 2026.
 *
 * Reine Daten — Typen und Logik liegen in `lib/learn-plans.ts`.
 *
 * Hinweis zu zwei Einträgen: In der Vorlage waren an Tag 18 und Tag 23 jeweils
 * zwei Themen in einer Zeile zusammengelaufen ("Atemwege und Lunge
 * Atemmechanik" bzw. "Säure-Base-Haushalt Harnleiter"). Beides sind erkennbar
 * je zwei eigenständige Themen — sie sind hier getrennt, weil ein
 * zusammengesetzter Pseudo-Begriff sonst als Generierungsthema landen würde.
 */
export const LEARN_PLAN_M1_DAYS: readonly LearnPlanDay[] = [
  { day: 1, subject: "Kreuztipps & Grundlagen der Zellbiologie und Physiologie", topics: ["Handbuch – Vorbereitung auf das Erste Staatsexamen / Physikum", "Kreuztipps zum Ersten Staatsexamen", "Die Zelle", "Stofftransport", "Signaltransduktion", "Ruhe- und Aktionspotential"] },
  { day: 2, subject: "Grundlagen der Physiologie und Chemie", topics: ["Leistungsphysiologie und Altern", "Aufbau der Materie"] },
  { day: 3, subject: "Grundlagen der Chemie und Physik", topics: ["Ionisierende Strahlung", "Thermodynamik", "Chemische Reaktionen"] },
  { day: 4, subject: "Grundlagen der Chemie und Biochemie", topics: ["Redoxchemie", "Grundlagen der organischen Chemie", "Enzyme und Biokatalyse", "Biochemische Labormethoden"] },
  { day: 5, subject: "Grundlagen der Zellbiologie", topics: ["Zellzyklus und Tumorentstehung", "Aufbau von DNA und RNA", "Replikation und Reparaturmechanismen der DNA", "Purine und Pyrimidine"] },
  { day: 6, subject: "Grundlagen der Zell- und Mikrobiologie", topics: ["Genexpression und Transkription", "Translation und Proteinbiosynthese", "Grundlagen der Mikrobiologie und Virologie", "Bakterien"] },
  { day: 7, subject: "Grundlagen der Anatomie und Histologie", topics: ["Allgemeine Anatomie", "Allgemeine Histologie", "Bindegewebe", "Fettgewebe"] },
  { day: 8, subject: "Grundlagen der Anatomie und Histologie", topics: ["Knorpelgewebe", "Knochengewebe", "Muskelgewebe", "Glatte Muskulatur", "Skelettmuskulatur"] },
  { day: 9, subject: "Verdauungssystem", topics: ["Bauchhöhle", "Übersicht des Verdauungssystems", "Mundhöhle", "Zähne", "Zunge", "Speicheldrüsen"] },
  { day: 10, subject: "Verdauungssystem", topics: ["Pharynx", "Ösophagus", "Magen", "Dünndarm", "Leber"] },
  { day: 11, subject: "Verdauungssystem", topics: ["Gallenblase und Galle", "Pankreas", "Zäkum und Kolon", "Rektum und Analkanal", "Übersicht Ernährung (Vorklinik)"] },
  { day: 12, subject: "Ernährung und Stoffwechsel", topics: ["Kohlenhydrate", "Abbau und Synthese der Glucose", "Glykogenstoffwechsel"] },
  { day: 13, subject: "Ernährung und Stoffwechsel", topics: ["Aminosäuren und Proteine", "Aminosäurestoffwechsel"] },
  { day: 14, subject: "Ernährung und Stoffwechsel", topics: ["Lipide", "Fettsäuren und Triacylglycerine", "Cholesterin"] },
  { day: 15, subject: "Ernährung und Stoffwechsel", topics: ["Citratzyklus", "Atmungskette", "Energie- und Wärmehaushalt", "Vitamine (Vorklinik)", "Mineralstoffe"] },
  { day: 16, subject: "Grundlagen der Physik", topics: ["Grundlagen des Rechnens", "Grundlagen der Mechanik", "Elektrizitätslehre"] },
  { day: 17, subject: "Herz-Kreislauf", topics: ["Grundlagen des Kreislaufs", "Aufbau des Herzens", "Herzerregung", "Herzmechanik"] },
  { day: 18, subject: "Herz-Kreislauf und Atmung", topics: ["Aufbau und Funktion der Blutgefäße", "Kreislaufregulation", "Atemwege und Lunge", "Atemmechanik"] },
  { day: 19, subject: "Blut", topics: ["Blut und Blutzellen", "Knochenmark und Blutbildung", "Erythrozyten", "Hämoglobin", "Gastransport im Blut", "Blutstillung und Blutgerinnung"] },
  { day: 20, subject: "Immunsystem", topics: ["Einführung in die Immunologie", "Unspezifisches Immunsystem", "Spezifisches Immunsystem"] },
  { day: 21, subject: "Immun- und lymphatisches System", topics: ["Gewebshormone", "Lymphatisches System", "Lymphknoten", "Milz", "Mucosa-assoziiertes lymphatisches Gewebe"] },
  { day: 22, subject: "Niere", topics: ["Niere", "Nierendurchblutung und glomeruläre Filtration", "Tubuläre Transportprozesse"] },
  { day: 23, subject: "Ableitende Harnwege und Elektrolythaushalt", topics: ["Wasser- und Elektrolythaushalt", "Säure-Base-Haushalt", "Harnleiter", "Harnblase", "Harnröhre"] },
  { day: 24, subject: "Hormonsystem und Endokrine Organe", topics: ["Allgemeine Hormoneigenschaften", "Hypophyse", "Schilddrüse", "Nebenschilddrüsen"] },
  { day: 25, subject: "Hormonsystem und Endokrine Organe", topics: ["Nebenniere", "Sexualhormone", "Pankreashormone"] },
  { day: 26, subject: "Geschlechtsorgane und Sexualität", topics: ["Ovar", "Tuba uterina", "Uterus", "Vagina und Vulva", "Mamma", "Hoden", "Prostata, Bläschendrüse und Cowper-Drüse", "Nebenhoden, Samenleiter und Samenstrang", "Penis, Erektion und Ejakulation", "Geschlechtsentwicklung", "Sexualität und Sexualmedizin"] },
  { day: 27, subject: "Entstehung neuen Lebens", topics: ["Grundlagen der Embryologie", "Von der Befruchtung bis zur Implantation", "Embryonalentwicklung", "Plazenta, Nabelschnur und Amnion", "Physiologische Aspekte prä- und postnatal", "Humangenetik (Vorklinik)"] },
  { day: 28, subject: "Obere Extremität", topics: ["Schulter und Schultergürtel", "Oberarm und Ellenbogen", "Unterarm", "Hand", "Leitungsbahnen der oberen Extremität"] },
  { day: 29, subject: "Untere Extremität", topics: ["Becken und Hüfte", "Oberschenkel und Knie", "Unterschenkel", "Sprunggelenke und Fuß", "Leitungsbahnen der unteren Extremität"] },
  { day: 30, subject: "Rumpf", topics: ["Brustwand", "Bauchwand", "Nacken und Rücken", "Wirbelsäule", "Brusthöhle", "Beckenhöhle", "Leitungsbahnen des Bauchraums"] },
  { day: 31, subject: "Kopf und Hals", topics: ["Übersicht der Kopf- und Halsregion", "Muskulatur von Kopf und Hals", "Kehlkopf, Sprechen und Sprache", "Nase und Nasennebenhöhlen"] },
  { day: 32, subject: "Schädel und Hirnnerven", topics: ["Schädel", "Hirnnerven"] },
  { day: 33, subject: "Nervensystem", topics: ["Einführung in die Neuroanatomie", "Nervengewebe, Synapsen und Transmitter", "Vegetatives Nervensystem", "Rückenmark", "Spinale Leitungsbahnen und Reflexe"] },
  { day: 34, subject: "Nervensystem", topics: ["Hirnstamm", "Kleinhirn", "Zwischenhirn", "Großhirn"] },
  { day: 35, subject: "Nervensystem", topics: ["Gefäßversorgung des Gehirns", "Meningen, Liquorsystem und Blut-Hirn-Schranke", "Neurophysiologische Untersuchungen und Schlaf", "Limbisches System und Gedächtnis"] },
  { day: 36, subject: "Nervensystem und Sinnesorgane", topics: ["Grundlagen der Sensorik", "Haut und Hautanhangsgebilde", "Taktiles System", "Nozizeptives System", "Olfaktorisches und gustatorisches System"] },
  { day: 37, subject: "Sinnesorgane", topics: ["Auge und Orbita", "Optik und optische Geräte", "Visuelles System"] },
  { day: 38, subject: "Sinnesorgane", topics: ["Ohr", "Akustik", "Auditives System", "Vestibuläres System"] },
  { day: 39, subject: "Psychologie und Soziologie", topics: ["Medizinische Statistik und Testtheorie", "Grundlagen wissenschaftlicher Studien", "Gesundheit und Krankheit", "Patientenversorgung und Gesundheitssystem"] },
  { day: 40, subject: "Psychologie und Soziologie", topics: ["Lernen, Kognition und Entwicklung", "Emotion und Motivation", "Persönlichkeit und Verhaltensstile"] },
  { day: 41, subject: "Psychologie und Soziologie", topics: ["Grundlagen der Demographie und Soziologie", "Beziehung zwischen Ärzt:innen und Patient:innen", "Untersuchung und Gespräch"] },
  { day: 42, subject: "Psychologie und Soziologie", topics: ["Ärztliche Urteilsbildung und Entscheidung", "Prävention und Gesundheitsförderung", "Stressmodelle", "Verhaltens- und psychodynamische Modelle"] },
  { day: 43, subject: "Psychologie und Soziologie", topics: ["Psychotherapeutische Verfahren (Vorklinik)", "Umgang mit dem Sterben", "Erstes Staatsexamen (schriftlicher Teil)", "Erstes Staatsexamen (mündlicher Teil)"] },
]
