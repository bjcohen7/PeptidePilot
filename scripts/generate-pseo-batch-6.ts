/**
 * Generates PSEO batch 6: 150 pages from 10 seed search terms.
 * Outputs shared/pseoContent-batch-6.ts and shared/pseoIndex-batch-6.ts
 *
 * Usage: npx tsx scripts/generate-pseo-batch-6.ts
 */
import fs from "node:fs";
import path from "node:path";

type CompRec = {
  slug: string;
  title: string;
  a: string;
  b: string;
  context: string;
};

type GoalRec = {
  slug: string;
  title: string;
  condition: string;
};

type ContentBlock = { heading: string; body: string };
type Score = { label: string; value: number; note: string };
type Faq = { question: string; answer: string };

type ContentRec = {
  path: string;
  title: string;
  summary: string;
  keyPoints: string[];
  scorecard: Score[];
  blocks: ContentBlock[];
  decisionChecklist: string[];
  faqs: Faq[];
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const COMPARE_SEEDS: CompRec[] = [
  // GLP-1 comparisons (from victoza vs ozempic, aod 9604 vs semaglutide)
  { slug: "victoza-vs-ozempic", title: "Victoza vs Ozempic", a: "Victoza (liraglutide)", b: "Ozempic (semaglutide)", context: "GLP-1 medication" },
  { slug: "ozempic-vs-victoza", title: "Ozempic vs Victoza", a: "Ozempic (semaglutide)", b: "Victoza (liraglutide)", context: "GLP-1 medication" },
  { slug: "victoza-vs-wegovy", title: "Victoza vs Wegovy", a: "Victoza (liraglutide)", b: "Wegovy (semaglutide)", context: "GLP-1 medication" },
  { slug: "wegovy-vs-victoza", title: "Wegovy vs Victoza", a: "Wegovy (semaglutide)", b: "Victoza (liraglutide)", context: "GLP-1 medication" },
  { slug: "victoza-vs-saxenda", title: "Victoza vs Saxenda", a: "Victoza (liraglutide)", b: "Saxenda (liraglutide)", context: "GLP-1 medication" },
  { slug: "saxenda-vs-victoza", title: "Saxenda vs Victoza", a: "Saxenda (liraglutide)", b: "Victoza (liraglutide)", context: "GLP-1 medication" },
  { slug: "ozempic-vs-wegovy", title: "Ozempic vs Wegovy", a: "Ozempic (semaglutide)", b: "Wegovy (semaglutide)", context: "GLP-1 medication" },
  { slug: "wegovy-vs-ozempic", title: "Wegovy vs Ozempic", a: "Wegovy (semaglutide)", b: "Ozempic (semaglutide)", context: "GLP-1 medication" },
  { slug: "ozempic-vs-saxenda", title: "Ozempic vs Saxenda", a: "Ozempic (semaglutide)", b: "Saxenda (liraglutide)", context: "GLP-1 medication" },
  { slug: "saxenda-vs-ozempic", title: "Saxenda vs Ozempic", a: "Saxenda (liraglutide)", b: "Ozempic (semaglutide)", context: "GLP-1 medication" },
  { slug: "victoza-vs-mounjaro", title: "Victoza vs Mounjaro", a: "Victoza (liraglutide)", b: "Mounjaro (tirzepatide)", context: "GLP-1 medication" },
  { slug: "mounjaro-vs-victoza", title: "Mounjaro vs Victoza", a: "Mounjaro (tirzepatide)", b: "Victoza (liraglutide)", context: "GLP-1 medication" },
  { slug: "victoza-vs-trulicity", title: "Victoza vs Trulicity", a: "Victoza (liraglutide)", b: "Trulicity (dulaglutide)", context: "GLP-1 medication" },
  { slug: "trulicity-vs-victoza", title: "Trulicity vs Victoza", a: "Trulicity (dulaglutide)", b: "Victoza (liraglutide)", context: "GLP-1 medication" },
  { slug: "victoza-vs-rybelsus", title: "Victoza vs Rybelsus", a: "Victoza (liraglutide)", b: "Rybelsus (semaglutide)", context: "GLP-1 medication" },
  { slug: "rybelsus-vs-victoza", title: "Rybelsus vs Victoza", a: "Rybelsus (semaglutide)", b: "Victoza (liraglutide)", context: "GLP-1 medication" },
  { slug: "ozempic-vs-mounjaro", title: "Ozempic vs Mounjaro", a: "Ozempic (semaglutide)", b: "Mounjaro (tirzepatide)", context: "GLP-1 medication" },
  { slug: "mounjaro-vs-ozempic", title: "Mounjaro vs Ozempic", a: "Mounjaro (tirzepatide)", b: "Ozempic (semaglutide)", context: "GLP-1 medication" },
  { slug: "victoza-vs-ozempic-for-weight-loss", title: "Victoza vs Ozempic for Weight Loss", a: "Victoza (liraglutide)", b: "Ozempic (semaglutide)", context: "weight loss" },
  { slug: "victoza-vs-ozempic-for-diabetes", title: "Victoza vs Ozempic for Diabetes", a: "Victoza (liraglutide)", b: "Ozempic (semaglutide)", context: "diabetes management" },
  { slug: "ozempic-vs-wegovy-for-weight-loss", title: "Ozempic vs Wegovy for Weight Loss", a: "Ozempic (semaglutide)", b: "Wegovy (semaglutide)", context: "weight loss" },
  { slug: "mounjaro-vs-ozempic-for-weight-loss", title: "Mounjaro vs Ozempic for Weight Loss", a: "Mounjaro (tirzepatide)", b: "Ozempic (semaglutide)", context: "weight loss" },
  { slug: "semaglutide-vs-liraglutide", title: "Semaglutide vs Liraglutide", a: "Semaglutide", b: "Liraglutide", context: "GLP-1 medication" },
  { slug: "liraglutide-vs-semaglutide", title: "Liraglutide vs Semaglutide", a: "Liraglutide", b: "Semaglutide", context: "GLP-1 medication" },
  { slug: "trulicity-vs-ozempic", title: "Trulicity vs Ozempic", a: "Trulicity (dulaglutide)", b: "Ozempic (semaglutide)", context: "GLP-1 medication" },
  { slug: "mounjaro-vs-trulicity", title: "Mounjaro vs Trulicity", a: "Mounjaro (tirzepatide)", b: "Trulicity (dulaglutide)", context: "GLP-1 medication" },
  { slug: "wegovy-vs-mounjaro", title: "Wegovy vs Mounjaro", a: "Wegovy (semaglutide)", b: "Mounjaro (tirzepatide)", context: "weight loss" },
  { slug: "semaglutide-vs-dulaglutide", title: "Semaglutide vs Dulaglutide", a: "Semaglutide", b: "Dulaglutide", context: "GLP-1 medication" },
  { slug: "rybelsus-vs-ozempic-for-diabetes", title: "Rybelsus vs Ozempic for Diabetes", a: "Rybelsus (oral semaglutide)", b: "Ozempic (injectable semaglutide)", context: "diabetes management" },
  { slug: "mounjaro-vs-saxenda-for-weight-loss", title: "Mounjaro vs Saxenda for Weight Loss", a: "Mounjaro (tirzepatide)", b: "Saxenda (liraglutide)", context: "weight loss" },
  // Semax vs Selank
  { slug: "semax-vs-selank", title: "Semax vs Selank", a: "Semax", b: "Selank", context: "nootropic peptide" },
  { slug: "selank-vs-semax", title: "Selank vs Semax", a: "Selank", b: "Semax", context: "nootropic peptide" },
  { slug: "semax-vs-noopept", title: "Semax vs Noopept", a: "Semax", b: "Noopept", context: "nootropic" },
  { slug: "noopept-vs-semax", title: "Noopept vs Semax", a: "Noopept", b: "Semax", context: "nootropic" },
  { slug: "selank-vs-noopept", title: "Selank vs Noopept", a: "Selank", b: "Noopept", context: "nootropic" },
  { slug: "noopept-vs-selank", title: "Noopept vs Selank", a: "Noopept", b: "Selank", context: "nootropic" },
  { slug: "semax-vs-piracetam", title: "Semax vs Piracetam", a: "Semax", b: "Piracetam", context: "nootropic" },
  { slug: "piracetam-vs-semax", title: "Piracetam vs Semax", a: "Piracetam", b: "Semax", context: "nootropic" },
  { slug: "selank-vs-piracetam", title: "Selank vs Piracetam", a: "Selank", b: "Piracetam", context: "nootropic" },
  { slug: "piracetam-vs-selank", title: "Piracetam vs Selank", a: "Piracetam", b: "Selank", context: "nootropic" },
  { slug: "semax-vs-phenylpiracetam", title: "Semax vs Phenylpiracetam", a: "Semax", b: "Phenylpiracetam", context: "nootropic" },
  { slug: "selank-vs-aniracetam", title: "Selank vs Aniracetam", a: "Selank", b: "Aniracetam", context: "nootropic" },
  { slug: "semax-vs-selank-for-anxiety", title: "Semax vs Selank for Anxiety", a: "Semax", b: "Selank", context: "anxiety management" },
  { slug: "semax-vs-selank-for-focus", title: "Semax vs Selank for Focus", a: "Semax", b: "Selank", context: "cognitive focus" },
  { slug: "semax-vs-selank-for-cognitive-enhancement", title: "Semax vs Selank for Cognitive Enhancement", a: "Semax", b: "Selank", context: "cognitive enhancement" },
  // AOD 9604 vs semaglutide
  { slug: "aod-9604-vs-semaglutide", title: "AOD 9604 vs Semaglutide", a: "AOD 9604", b: "Semaglutide", context: "weight loss" },
  { slug: "semaglutide-vs-aod-9604", title: "Semaglutide vs AOD 9604", a: "Semaglutide", b: "AOD 9604", context: "weight loss" },
  { slug: "aod-9604-vs-tirzepatide", title: "AOD 9604 vs Tirzepatide", a: "AOD 9604", b: "Tirzepatide", context: "weight loss" },
  { slug: "aod-9604-vs-semaglutide-for-weight-loss", title: "AOD 9604 vs Semaglutide for Weight Loss", a: "AOD 9604", b: "Semaglutide", context: "weight loss" },
  { slug: "aod-9604-vs-retatrutide", title: "AOD 9604 vs Retatrutide", a: "AOD 9604", b: "Retatrutide", context: "weight loss" },
  { slug: "aod-9604-vs-tesofensine", title: "AOD 9604 vs Tesofensine", a: "AOD 9604", b: "Tesofensine", context: "weight loss" },
  { slug: "aod-9604-vs-liraglutide", title: "AOD 9604 vs Liraglutide", a: "AOD 9604", b: "Liraglutide", context: "weight loss" },
  { slug: "aod-9604-vs-phentermine", title: "AOD 9604 vs Phentermine", a: "AOD 9604", b: "Phentermine", context: "weight loss" },
  { slug: "semaglutide-vs-phentermine", title: "Semaglutide vs Phentermine", a: "Semaglutide", b: "Phentermine", context: "weight loss" },
  { slug: "aod-9604-vs-motsc", title: "AOD 9604 vs MOTS-c", a: "AOD 9604", b: "MOTS-c", context: "weight loss" },
  { slug: "aod-9604-vs-semaglutide-side-effects", title: "AOD 9604 vs Semaglutide Side Effects", a: "AOD 9604", b: "Semaglutide", context: "side effects comparison" },
  // Ipamorelin vs Sermorelin
  { slug: "ipamorelin-vs-sermorelin", title: "Ipamorelin vs Sermorelin", a: "Ipamorelin", b: "Sermorelin", context: "GH secretagogue" },
  { slug: "sermorelin-vs-ipamorelin", title: "Sermorelin vs Ipamorelin", a: "Sermorelin", b: "Ipamorelin", context: "GH secretagogue" },
  { slug: "ipamorelin-vs-tesamorelin", title: "Ipamorelin vs Tesamorelin", a: "Ipamorelin", b: "Tesamorelin", context: "GH secretagogue" },
  { slug: "sermorelin-vs-tesamorelin", title: "Sermorelin vs Tesamorelin", a: "Sermorelin", b: "Tesamorelin", context: "GH secretagogue" },
  { slug: "ipamorelin-vs-cjc-1295", title: "Ipamorelin vs CJC-1295", a: "Ipamorelin", b: "CJC-1295", context: "GH secretagogue" },
  { slug: "sermorelin-vs-cjc-1295", title: "Sermorelin vs CJC-1295", a: "Sermorelin", b: "CJC-1295", context: "GH secretagogue" },
  { slug: "ipamorelin-vs-sermorelin-for-muscle-growth", title: "Ipamorelin vs Sermorelin for Muscle Growth", a: "Ipamorelin", b: "Sermorelin", context: "muscle growth" },
  { slug: "ipamorelin-vs-sermorelin-for-anti-aging", title: "Ipamorelin vs Sermorelin for Anti-Aging", a: "Ipamorelin", b: "Sermorelin", context: "anti-aging" },
  { slug: "ipamorelin-vs-sermorelin-for-weight-loss", title: "Ipamorelin vs Sermorelin for Weight Loss", a: "Ipamorelin", b: "Sermorelin", context: "weight loss" },
  { slug: "semax-vs-selank-dosage", title: "Semax vs Selank: Dosage Comparison", a: "Semax", b: "Selank", context: "dosage" },
  { slug: "aod-9604-vs-hgh-fragment", title: "AOD 9604 vs HGH Fragment 176-191", a: "AOD 9604", b: "HGH Fragment 176-191", context: "weight loss" },
  { slug: "semaglutide-vs-tirzepatide-vs-retatrutide", title: "Semaglutide vs Tirzepatide vs Retatrutide", a: "Semaglutide", b: "Tirzepatide vs Retatrutide", context: "weight loss" },
  { slug: "victoza-vs-ozempic-dosage", title: "Victoza vs Ozempic: Dosage Comparison", a: "Victoza (liraglutide)", b: "Ozempic (semaglutide)", context: "dosage" },
  { slug: "ipamorelin-vs-sermorelin-cost", title: "Ipamorelin vs Sermorelin: Cost Comparison", a: "Ipamorelin", b: "Sermorelin", context: "cost" },
  { slug: "semaglutide-vs-tirzepatide-for-weight-loss", title: "Semaglutide vs Tirzepatide for Weight Loss", a: "Semaglutide", b: "Tirzepatide", context: "weight loss" },
  { slug: "wegovy-vs-saxenda", title: "Wegovy vs Saxenda", a: "Wegovy (semaglutide)", b: "Saxenda (liraglutide)", context: "weight loss" },
  { slug: "saxenda-vs-wegovy", title: "Saxenda vs Wegovy", a: "Saxenda (liraglutide)", b: "Wegovy (semaglutide)", context: "weight loss" },
  { slug: "ozempic-vs-rybelsus", title: "Ozempic vs Rybelsus", a: "Ozempic (injectable semaglutide)", b: "Rybelsus (oral semaglutide)", context: "diabetes management" },
  { slug: "aod-9604-vs-tirzepatide-for-weight-loss", title: "AOD 9604 vs Tirzepatide for Weight Loss", a: "AOD 9604", b: "Tirzepatide", context: "weight loss" },
  { slug: "semax-vs-modafinil", title: "Semax vs Modafinil", a: "Semax", b: "Modafinil", context: "nootropic" },
  { slug: "selank-vs-modafinil", title: "Selank vs Modafinil", a: "Selank", b: "Modafinil", context: "nootropic" },
  { slug: "ipamorelin-vs-sermorelin-for-fat-loss", title: "Ipamorelin vs Sermorelin for Fat Loss", a: "Ipamorelin", b: "Sermorelin", context: "fat loss" },
  { slug: "aod-9604-vs-clenbuterol", title: "AOD 9604 vs Clenbuterol", a: "AOD 9604", b: "Clenbuterol", context: "weight loss" },
  { slug: "semaglutide-vs-retatrutide", title: "Semaglutide vs Retatrutide", a: "Semaglutide", b: "Retatrutide", context: "weight loss" },
  { slug: "liraglutide-vs-tirzepatide", title: "Liraglutide vs Tirzepatide", a: "Liraglutide", b: "Tirzepatide", context: "weight loss" },
  { slug: "semax-vs-aniracetam", title: "Semax vs Aniracetam", a: "Semax", b: "Aniracetam", context: "nootropic" },
  { slug: "selank-vs-phenylpiracetam", title: "Selank vs Phenylpiracetam", a: "Selank", b: "Phenylpiracetam", context: "nootropic" },
  { slug: "ipamorelin-vs-sermorelin-for-recovery", title: "Ipamorelin vs Sermorelin for Recovery", a: "Ipamorelin", b: "Sermorelin", context: "recovery" },
  { slug: "semaglutide-vs-retatrutide-for-weight-loss", title: "Semaglutide vs Retatrutide for Weight Loss", a: "Semaglutide", b: "Retatrutide", context: "weight loss" },
  { slug: "aod-9604-vs-semaglutide-cost", title: "AOD 9604 vs Semaglutide: Cost", a: "AOD 9604", b: "Semaglutide", context: "cost" },
  { slug: "ozempic-vs-tirzepatide", title: "Ozempic vs Tirzepatide", a: "Ozempic (semaglutide)", b: "Tirzepatide", context: "weight loss" },
  { slug: "semax-vs-selank-stack", title: "Semax and Selank Stack", a: "Semax", b: "Selank", context: "nootropic" },
];

const GOAL_SEEDS: GoalRec[] = [
  // Joint pain / inflammation
  { slug: "joint-pain", title: "Best Peptides for Joint Pain", condition: "joint pain" },
  { slug: "knee-pain", title: "Best Peptides for Knee Pain", condition: "knee pain" },
  { slug: "arthritis", title: "Best Peptides for Arthritis", condition: "arthritis" },
  { slug: "inflammation", title: "Best Peptides for Inflammation", condition: "inflammation" },
  { slug: "back-pain", title: "Best Peptides for Back Pain", condition: "back pain" },
  { slug: "shoulder-pain", title: "Best Peptides for Shoulder Pain", condition: "shoulder pain" },
  { slug: "hip-pain", title: "Best Peptides for Hip Pain", condition: "hip pain" },
  { slug: "joint-repair", title: "Best Peptides for Joint Repair", condition: "joint repair" },
  { slug: "cartilage-repair", title: "Best Peptides for Cartilage Repair", condition: "cartilage repair" },
  { slug: "osteoarthritis", title: "Best Peptides for Osteoarthritis", condition: "osteoarthritis" },
  // Healing
  { slug: "healing", title: "Best Peptides for Healing", condition: "healing" },
  { slug: "wound-healing", title: "Best Peptides for Wound Healing", condition: "wound healing" },
  { slug: "muscle-healing", title: "Best Peptides for Muscle Healing", condition: "muscle healing" },
  { slug: "tendon-healing", title: "Best Peptides for Tendon Healing", condition: "tendon healing" },
  { slug: "bone-healing", title: "Best Peptides for Bone Healing", condition: "bone healing" },
  { slug: "ligament-healing", title: "Best Peptides for Ligament Healing", condition: "ligament healing" },
  { slug: "soft-tissue-healing", title: "Best Peptides for Soft Tissue Healing", condition: "soft tissue healing" },
  { slug: "nerve-healing", title: "Best Peptides for Nerve Healing", condition: "nerve healing" },
  { slug: "skin-healing", title: "Best Peptides for Skin Healing", condition: "skin healing" },
  { slug: "gut-healing", title: "Best Peptides for Gut Healing", condition: "gut healing" },
  // CrossFit / athletics
  { slug: "crossfit", title: "Best Peptides for CrossFit", condition: "CrossFit" },
  { slug: "hiit", title: "Best Peptides for HIIT", condition: "HIIT training" },
  { slug: "functional-fitness", title: "Best Peptides for Functional Fitness", condition: "functional fitness" },
  { slug: "endurance-athletes", title: "Best Peptides for Endurance Athletes", condition: "endurance athletes" },
  { slug: "runners", title: "Best Peptides for Runners", condition: "runners" },
  { slug: "weightlifting", title: "Best Peptides for Weightlifting", condition: "weightlifting" },
  { slug: "bodybuilding", title: "Best Peptides for Bodybuilding", condition: "bodybuilding" },
  { slug: "strength-training", title: "Best Peptides for Strength Training", condition: "strength training" },
  { slug: "athletic-performance", title: "Best Peptides for Athletic Performance", condition: "athletic performance" },
  { slug: "combat-sports", title: "Best Peptides for Combat Sports", condition: "combat sports" },
  // Surgery recovery
  { slug: "surgery-recovery", title: "Best Peptides for Surgery Recovery", condition: "surgery recovery" },
  { slug: "post-surgery-recovery", title: "Best Peptides for Post-Surgery Recovery", condition: "post-surgery recovery" },
  { slug: "post-op-recovery", title: "Best Peptides for Post-Op Recovery", condition: "post-operative recovery" },
  { slug: "acl-surgery-recovery", title: "Best Peptides for ACL Surgery Recovery", condition: "ACL surgery recovery" },
  { slug: "rotator-cuff-surgery", title: "Best Peptides for Rotator Cuff Surgery Recovery", condition: "rotator cuff surgery recovery" },
  { slug: "joint-replacement-recovery", title: "Best Peptides for Joint Replacement Recovery", condition: "joint replacement recovery" },
  { slug: "spinal-surgery-recovery", title: "Best Peptides for Spinal Surgery Recovery", condition: "spinal surgery recovery" },
  { slug: "meniscus-surgery", title: "Best Peptides for Meniscus Surgery Recovery", condition: "meniscus surgery recovery" },
  { slug: "hernia-repair-recovery", title: "Best Peptides for Hernia Repair Recovery", condition: "hernia repair recovery" },
  { slug: "tendon-surgery-recovery", title: "Best Peptides for Tendon Surgery Recovery", condition: "tendon surgery recovery" },
  // Recovery
  { slug: "recovery", title: "Best Peptides for Recovery", condition: "recovery" },
  { slug: "muscle-recovery", title: "Best Peptides for Muscle Recovery", condition: "muscle recovery" },
  { slug: "workout-recovery", title: "Best Peptides for Workout Recovery", condition: "workout recovery" },
  { slug: "exercise-recovery", title: "Best Peptides for Exercise Recovery", condition: "exercise recovery" },
  { slug: "injury-recovery", title: "Best Peptides for Injury Recovery", condition: "injury recovery" },
  { slug: "sports-recovery", title: "Best Peptides for Sports Recovery", condition: "sports recovery" },
  { slug: "post-workout-recovery", title: "Best Peptides for Post-Workout Recovery", condition: "post-workout recovery" },
  { slug: "training-recovery", title: "Best Peptides for Training Recovery", condition: "training recovery" },
  { slug: "fatigue-recovery", title: "Best Peptides for Fatigue Recovery", condition: "fatigue recovery" },
  { slug: "faster-recovery", title: "Best Peptides for Faster Recovery", condition: "faster recovery" },
  { slug: "overtraining-recovery", title: "Best Peptides for Overtraining Recovery", condition: "overtraining recovery" },
  // Extended
  { slug: "fracture-healing", title: "Best Peptides for Fracture Healing", condition: "fracture healing" },
  { slug: "connective-tissue", title: "Best Peptides for Connective Tissue", condition: "connective tissue health" },
  { slug: "joint-mobility", title: "Best Peptides for Joint Mobility", condition: "joint mobility" },
  { slug: "muscle-strain", title: "Best Peptides for Muscle Strain", condition: "muscle strain recovery" },
  { slug: "tendonitis", title: "Best Peptides for Tendonitis", condition: "tendonitis" },
  { slug: "sprain-recovery", title: "Best Peptides for Sprain Recovery", condition: "sprain recovery" },
  { slug: "post-training-recovery", title: "Best Peptides for Post-Training Recovery", condition: "post-training recovery" },
  { slug: "mobility", title: "Best Peptides for Mobility", condition: "mobility" },
  { slug: "immune-recovery", title: "Best Peptides for Immune Recovery", condition: "immune recovery" },
  { slug: "sleep-and-recovery", title: "Best Peptides for Sleep and Recovery", condition: "sleep and recovery" },
  // Additional to hit 150
  { slug: "post-marathon-recovery", title: "Best Peptides for Post-Marathon Recovery", condition: "post-marathon recovery" },
  { slug: "strength-and-recovery", title: "Best Peptides for Strength and Recovery", condition: "strength and recovery" },
  { slug: "labral-tear-recovery", title: "Best Peptides for Labral Tear Recovery", condition: "labral tear recovery" },
  { slug: "cervical-fusion-recovery", title: "Best Peptides for Cervical Fusion Recovery", condition: "cervical fusion recovery" },
  { slug: "meniscus-tear-recovery", title: "Best Peptides for Meniscus Tear Recovery", condition: "meniscus tear recovery" },
  { slug: "achilles-tendon-recovery", title: "Best Peptides for Achilles Tendon Recovery", condition: "Achilles tendon recovery" },
  { slug: "hamstring-recovery", title: "Best Peptides for Hamstring Recovery", condition: "hamstring recovery" },
  { slug: "groin-pull-recovery", title: "Best Peptides for Groin Pull Recovery", condition: "groin pull recovery" },
  { slug: "shin-splints", title: "Best Peptides for Shin Splints", condition: "shin splints" },
  { slug: "plantar-fasciitis", title: "Best Peptides for Plantar Fasciitis", condition: "plantar fasciitis" },
  { slug: "tennis-elbow", title: "Best Peptides for Tennis Elbow", condition: "tennis elbow" },
  { slug: "golfs-elbow", title: "Best Peptides for Golfer's Elbow", condition: "golfer's elbow" },
  { slug: "bursitis", title: "Best Peptides for Bursitis", condition: "bursitis" },
  { slug: "si-joint-pain", title: "Best Peptides for SI Joint Pain", condition: "SI joint pain" },
  { slug: "neck-pain", title: "Best Peptides for Neck Pain", condition: "neck pain" },
  { slug: "tmj-pain", title: "Best Peptides for TMJ Pain", condition: "TMJ pain" },
  { slug: "rib-injury-recovery", title: "Best Peptides for Rib Injury Recovery", condition: "rib injury recovery" },
  { slug: "hip-flexor-recovery", title: "Best Peptides for Hip Flexor Recovery", condition: "hip flexor recovery" },
  { slug: "muscle-cramps", title: "Best Peptides for Muscle Cramps", condition: "muscle cramps" },
  { slug: "spine-health", title: "Best Peptides for Spine Health", condition: "spine health" },
  { slug: "disc-bulge-recovery", title: "Best Peptides for Disc Bulge Recovery", condition: "disc bulge recovery" },
  { slug: "sciatica", title: "Best Peptides for Sciatica", condition: "sciatica" },
  { slug: "piriformis-syndrome", title: "Best Peptides for Piriformis Syndrome", condition: "piriformis syndrome" },
  { slug: "costochondritis", title: "Best Peptides for Costochondritis", condition: "costochondritis" },
  { slug: "rib-fracture-healing", title: "Best Peptides for Rib Fracture Healing", condition: "rib fracture healing" },
  { slug: "posture-support", title: "Best Peptides for Posture Support", condition: "posture support" },
  { slug: "core-strength-recovery", title: "Best Peptides for Core Strength Recovery", condition: "core strength recovery" },
  { slug: "pelvic-floor-recovery", title: "Best Peptides for Pelvic Floor Recovery", condition: "pelvic floor recovery" },
  { slug: "overuse-injury", title: "Best Peptides for Overuse Injury", condition: "overuse injury" },
  { slug: "stress-fracture-recovery", title: "Best Peptides for Stress Fracture Recovery", condition: "stress fracture recovery" },
  { slug: "weightlifting-injury-recovery", title: "Best Peptides for Weightlifting Injury Recovery", condition: "weightlifting injury recovery" },
];

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

function buildCompareTitle(title: string): string {
  return title;
}

function buildCompareContent(r: CompRec): ContentRec {
  const shortA = r.a.replace(/\(.*\)/, "").trim();
  const shortB = r.b.replace(/\(.*\)/, "").trim();
  const isGLP1 = r.context.includes("GLP-1") || r.context.includes("weight loss") || r.context.includes("diabetes");
  const isNootropic = r.context.includes("nootropic");
  const isGH = r.context.includes("GH secretagogue") || r.context.includes("anti-aging") || r.context.includes("muscle growth");
  const isDosage = r.context === "dosage";
  const isCost = r.context === "cost";
  const isSideEffects = r.context.includes("side effects");

  let summary: string;
  let keyPoints: string[];
  let scorecard: Score[];
  let blocks: ContentBlock[];
  let decisionChecklist: string[];
  let faqs: Faq[];

  if (isGLP1) {
    summary = `Trying to decide between ${r.a} and ${r.b}? We break down the key differences, mechanisms, clinical evidence, and practical considerations to help you choose.`;
    keyPoints = [
      `${r.a} and ${r.b} work through different receptor pathways, which affects their efficacy and side effect profiles.`,
      `Clinical outcomes, dosing frequency, and insurance coverage often matter more than theoretical mechanisms.`,
      `A responsible comparison includes screening requirements, titration protocols, and follow-up support — not just price.`,
    ];
    scorecard = [
      { label: "Evidence", value: 9, note: "Strong clinical trial data for both options" },
      { label: "Goal fit", value: 8, note: "Highly relevant for metabolic health" },
      { label: "Complexity", value: 6, note: "Requires medical screening and monitoring" },
      { label: "Caution", value: 7, note: "Side effects and contraindications to review" },
    ];
    blocks = [
      { heading: `How ${shortA} and ${shortB} differ`, body: `The most important difference between ${r.a} and ${r.b} comes down to their mechanisms and clinical positioning. ${shortA} has a well-established track record in ${r.context}, while ${shortB} offers distinct advantages depending on the specific use case. Understanding these differences is the first step toward an informed decision.` },
      { heading: `What changes the decision`, body: `The right choice depends on several factors: your specific health goals, tolerance for potential side effects, dosing convenience, insurance coverage, and clinician recommendation. Both medications require a prescription and medical supervision — self-sourcing is never advisable for prescription GLP-1 therapies.` },
      { heading: `What to ask a provider`, body: `A good provider will explain dose escalation, expected side effects, red-flag symptoms, and when to follow up. They should also discuss contraindications including pancreatitis history, gallbladder disease, and medication interactions. These practical details matter as much as which medication you choose.` },
    ];
    decisionChecklist = [
      "Clarify whether you have access to a licensed prescriber who can evaluate your specific health history.",
      "Ask about dose titration, expected side effects, and what to do if side effects become bothersome.",
      "Compare total monthly cost including any required lab work or follow-up visits.",
      "Verify who handles contraindication screening, especially for thyroid, pancreas, or gallbladder concerns.",
    ];
    faqs = [
      { question: `Is ${shortA} better than ${shortB}?`, answer: `Not automatically. The right choice depends on your specific health profile, goals, and how you respond to the medication. Both have strong clinical evidence supporting their use.` },
      { question: `Can I switch between ${shortA} and ${shortB}?`, answer: `Switching is sometimes possible under medical supervision, but it requires careful dose adjustment and monitoring. Always consult your prescribing clinician before making a switch.` },
    ];
  } else if (isNootropic) {
    summary = `Comparing ${r.a} and ${r.b} for cognitive enhancement? We review the mechanisms, user experiences, and practical differences to help you decide which nootropic fits your needs.`;
    keyPoints = [
      `${shortA} and ${shortB} target different neurotransmitter systems, which leads to distinct cognitive effects.`,
      `Individual response varies significantly — what works well for one person may not work the same way for another.`,
      `Sourcing quality, dosage accuracy, and cycling protocols matter for safety and effectiveness.`,
    ];
    scorecard = [
      { label: "Evidence", value: 4, note: "Limited human clinical data, strong anecdotal reports" },
      { label: "Goal fit", value: 7, note: "Relevant for cognitive enhancement goals" },
      { label: "Complexity", value: 5, note: "Dosing and sourcing require attention" },
      { label: "Caution", value: 6, note: "Research compound status affects safety framework" },
    ];
    blocks = [
      { heading: `Mechanism comparison`, body: `${r.a} and ${r.b} work through different pathways in the brain. ${shortA} is primarily associated with ${r.context === "anxiety management" ? "anxiolytic and mood-balancing effects" : "cognitive enhancement and focus"}, while ${shortB} is known for ${r.context === "cognitive focus" ? "its focus-enhancing properties" : "its distinct cognitive profile"}. Understanding these mechanisms helps set realistic expectations.` },
      { heading: `What users typically report`, body: `Individual experiences vary, but common themes emerge. ${shortA} users often describe ${r.context === "anxiety management" ? "a calming, focused state without sedation" : "improved mental clarity and processing speed"}. ${shortB} users typically report ${r.context === "cognitive focus" ? "reduced anxiety with maintained focus" : "different cognitive effects that complement or contrast with ${shortA}"}.` },
      { heading: `Practical considerations`, body: `Dosage, timing, and cycling are important factors. Start low and go slow when testing either compound. Sourcing from reputable vendors with third-party testing is essential for research compounds. Consider keeping a log to track effects and any side effects.` },
    ];
    decisionChecklist = [
      "Start with a low dose to assess individual response before adjusting upward.",
      "Source from vendors that provide third-party lab testing and certificates of analysis.",
      "Consider cycling to maintain effectiveness and assess ongoing need.",
      "Track your response in a journal to identify what works best for your specific situation.",
    ];
    faqs = [
      { question: `Can ${shortA} and ${shortB} be taken together?`, answer: `Some users experiment with combining nootropics, but this increases complexity and makes it harder to assess individual effects. It's generally recommended to try each compound separately first.` },
      { question: `Which has fewer side effects?`, answer: `Both are generally well-tolerated when used responsibly, but individual responses vary. Starting with a low dose is the best way to assess your personal tolerance.` },
    ];
  } else if (isGH) {
    summary = `Deciding between ${r.a} and ${r.b}? We compare their mechanisms, effects, and practical considerations for ${r.context}.`;
    keyPoints = [
      `${shortA} and ${shortB} stimulate growth hormone release through different mechanisms, affecting their potency and side effect profiles.`,
      `Expected outcomes include improved body composition, recovery, and potential anti-aging effects — but results vary.`,
      `These are research compounds and should be approached with appropriate caution regarding sourcing, dosing, and monitoring.`,
    ];
    scorecard = [
      { label: "Evidence", value: 5, note: "Moderate human data, strong preclinical interest" },
      { label: "Goal fit", value: 7, note: "Relevant for body composition and recovery goals" },
      { label: "Complexity", value: 6, note: "Injection technique and sourcing add complexity" },
      { label: "Caution", value: 7, note: "Research status requires careful safety evaluation" },
    ];
    blocks = [
      { heading: `How they work`, body: `${r.a} and ${r.b} both stimulate endogenous growth hormone secretion, but they do so through different mechanisms. ${shortA} is known for its ${r.context.includes("muscle") ? "muscle growth" : r.context.includes("anti-aging") ? "anti-aging" : "growth hormone releasing"} properties, while ${shortB} offers a distinct profile in terms of release pattern and feedback effects.` },
      { heading: `What to expect`, body: `Users typically report improvements in recovery, sleep quality, body composition, and skin health. Results are gradual and build over weeks to months rather than producing immediate effects. Consistency and proper protocol adherence matter more than the specific compound chosen.` },
      { heading: `Choosing between them`, body: `The decision often comes down to personal goals, tolerance, and desired effect profile. ${shortA} may be preferred for ${r.context}, while ${shortB} might be a better fit for different priorities. Consulting with someone knowledgeable about peptide protocols is recommended.` },
    ];
    decisionChecklist = [
      "Clarify your primary goal: muscle growth, fat loss, anti-aging, or general recovery.",
      "Research proper dosing, timing, and cycling protocols before starting.",
      "Source from reputable vendors with third-party testing.",
      "Monitor your response and adjust based on results and side effects.",
    ];
    faqs = [
      { question: `Which is more potent?`, answer: `Potency depends on individual response and the specific outcome you're targeting. ${shortA} may be preferred for some goals while ${shortB} works better for others.` },
      { question: `Do I need blood work?`, answer: `Monitoring IGF-1 levels and other markers can help guide dosing and assess effectiveness. This is especially important for longer-term use.` },
    ];
  } else {
    summary = `Comparing ${r.a} and ${r.b}? We break down the key differences, mechanisms, and practical considerations to help you make an informed decision.`;
    keyPoints = [
      `${shortA} and ${shortB} have distinct mechanisms that affect their suitability for different use cases.`,
      `${r.context === "cost" ? "Cost differences between these options can be significant depending on sourcing and protocol." : "Individual factors like goals, tolerance, and access often determine which option is better suited."}`,
      `A thoughtful comparison considers evidence, practicality, and safety — not just popularity or price.`,
    ];
    scorecard = [
      { label: "Evidence", value: 5, note: "Varies by compound and use case" },
      { label: "Goal fit", value: 7, note: "Depends on specific goals and context" },
      { label: "Complexity", value: 6, note: "Requires attention to protocol and sourcing" },
      { label: "Caution", value: 7, note: "Research compounds need careful evaluation" },
    ];
    blocks = [
      { heading: `Key differences`, body: `${r.a} and ${r.b} differ in their mechanisms, onset, and typical use cases. ${shortA} is often discussed for certain outcomes while ${shortB} is preferred for others. Understanding these distinctions helps narrow down which option aligns with your specific situation.` },
      { heading: `Practical considerations`, body: `Factors like dosing frequency, administration route, cost, and sourcing availability all play a role in the decision. What works well on paper may not be the most practical choice for your lifestyle or budget.` },
      { heading: `Making a decision`, body: `The best choice depends on your specific goals, health status, and access to quality products. Consider starting with the option that best matches your primary objective and evaluating results before making changes.` },
    ];
    decisionChecklist = [
      "Define your primary goal and timeline before comparing options.",
      "Research proper protocols, dosing, and cycling for each option.",
      "Factor in cost, availability, and ease of administration.",
      "Start with one option at a time to assess individual response.",
    ];
    faqs = [
      { question: `Which is more effective?`, answer: `Effectiveness varies by individual and specific use case. The best approach is to match the compound to your specific goal and monitor your response.` },
      { question: `Can they be used together?`, answer: `Combining compounds increases complexity and should only be considered after understanding how each affects you individually. Always research potential interactions.` },
    ];
  }

  const path = `/compare/${r.slug}`;
  return { path, title: buildCompareTitle(r.title), summary, keyPoints, scorecard, blocks, decisionChecklist, faqs };
}

function buildGoalContent(r: GoalRec): ContentRec {
  const c = r.condition;

  let summary: string;
  let keyPoints: string[];
  let scorecard: Score[];
  let blocks: ContentBlock[];
  let decisionChecklist: string[];
  let faqs: Faq[];

  const isInjury = c.includes("pain") || c.includes("repair") || c.includes("injury") || c.includes("recovery") || c.includes("strain") || c.includes("sprain") || c.includes("tendonitis") || c.includes("bursitis") || c.includes("fracture") || c.includes("healing") || c.includes("surgery") || c.includes("post") || c.includes("muscle") || c.includes("tissue") || c.includes("ligament") || c.includes("nerve") || c.includes("skin") || c.includes("gut") || c.includes("bone") || c.includes("cartilage") || c.includes("arthritis") || c.includes("osteoarthritis") || c.includes("mobility") || c.includes("connective") || c.includes("joint");
  const isAthletic = c.includes("crossfit") || c.includes("athlete") || c.includes("HIIT") || c.includes("endurance") || c.includes("runner") || c.includes("weightlifting") || c.includes("bodybuilding") || c.includes("strength") || c.includes("performance") || c.includes("combat") || c.includes("fitness") || c.includes("training") || c.includes("workout") || c.includes("exercise") || c.includes("sport");
  const isHealing = c.includes("healing") || c.includes("wound");

  if (isInjury) {
    summary = `Looking for peptides that may support ${c}? We review the most commonly discussed peptides, their proposed mechanisms, evidence levels, and practical considerations.`;
    keyPoints = [
      `BPC-157 and TB-500 are the most frequently discussed peptides for ${c} in research communities.`,
      `The evidence is primarily preclinical and anecdotal — human clinical data remains limited.`,
      `Sourcing quality, sterile administration, and medical guidance are essential safety considerations.`,
    ];
    scorecard = [
      { label: "Evidence", value: 5, note: "Strong preclinical, limited human data" },
      { label: "Goal fit", value: 8, note: "Very relevant for recovery-focused users" },
      { label: "Complexity", value: 6, note: "Injection handling and sourcing matter" },
      { label: "Caution", value: 8, note: "Research-compound context requires care" },
    ];
    blocks = [
      { heading: `Top peptides discussed for ${c}`, body: `For ${c}, the peptides most commonly discussed in research communities include BPC-157 for localized tissue repair, TB-500 for systemic recovery, and GHK-Cu for tissue regeneration. Each has a distinct proposed mechanism and evidence profile that may be more or less relevant depending on the specific nature of your concern.` },
      { heading: `How they work`, body: `These peptides are thought to support healing through different pathways. BPC-157 is associated with angiogenesis and growth factor modulation. TB-500 is linked to actin regulation and cell migration. GHK-Cu is known for its role in collagen synthesis and antioxidant activity. Understanding these mechanisms helps match the peptide to your specific situation.` },
      { heading: `Choosing the right approach`, body: `The best choice depends on the type, location, and severity of your concern. Localized issues may benefit more from targeted peptides, while systemic or widespread concerns may call for broader approaches. Consulting with someone knowledgeable about peptide protocols is recommended before starting any regimen.` },
    ];
    decisionChecklist = [
      "Clarify the specific type and location of your concern before choosing a peptide.",
      "Research proper dosing, administration, and cycling protocols.",
      "Source from vendors that provide third-party lab testing and certificates of analysis.",
      "Consider working with a healthcare professional familiar with peptide therapies.",
    ];
    faqs = [
      { question: `What's the most effective peptide for ${c}?`, answer: `BPC-157 is the most commonly discussed option for ${c}, but individual results vary. The best choice depends on the specific nature of your concern and how your body responds.` },
      { question: `How long before I see results?`, answer: `Results timelines vary significantly. Some users report noticing changes within days to weeks, while others find that consistent use over several weeks is needed to assess effectiveness.` },
    ];
  } else if (isAthletic) {
    summary = `Looking for peptide support for ${c}? We review the most commonly discussed options for performance, recovery, and body composition.`;
    keyPoints = [
      `BPC-157 and TB-500 are popular in athletic communities for recovery and injury prevention.`,
      `GH secretagogues like Ipamorelin and Sermorelin are discussed for body composition and recovery benefits.`,
      `Proper nutrition, training, and sleep remain the foundation — peptides are a potential adjunct, not a replacement.`,
    ];
    scorecard = [
      { label: "Evidence", value: 5, note: "Mixed — some human data, mostly preclinical" },
      { label: "Goal fit", value: 7, note: "Relevant for athletic performance goals" },
      { label: "Complexity", value: 6, note: "Protocol, sourcing, and administration add layers" },
      { label: "Caution", value: 7, note: "Research compounds require careful evaluation" },
    ];
    blocks = [
      { heading: `Peptides relevant for ${c}`, body: `Athletes and active individuals most often discuss BPC-157 for injury recovery and prevention, TB-500 for systemic recovery, and GH secretagogues like Ipamorelin for improved sleep, recovery, and body composition. The right choice depends on your specific training demands and recovery needs.` },
      { heading: `What else matters`, body: `Peptides are not a shortcut. Training intensity, nutrition quality, sleep hygiene, and stress management are the foundation of athletic performance and recovery. Peptides may offer additional support, but they work best when the fundamentals are already in place.` },
      { heading: `Getting started`, body: `If you're considering peptides for ${c}, start by clarifying your primary goal: injury prevention, faster recovery between sessions, improved body composition, or something else. This will guide which peptide or protocol may be most appropriate for your situation.` },
    ];
    decisionChecklist = [
      "Define your primary athletic goal: recovery, performance, injury prevention, or body composition.",
      "Ensure your training, nutrition, and sleep fundamentals are solid first.",
      "Research protocols, dosing, and cycling specific to your sport or activity.",
      "Source responsibly from vendors with third-party testing.",
    ];
    faqs = [
      { question: `Are peptides safe for athletes?`, answer: `Safety depends on the specific peptide, sourcing quality, and administration practices. Some peptides may be prohibited by certain sports organizations. Always check your sport's regulations and consult a professional.` },
      { question: `Will peptides improve my performance directly?`, answer: `Most peptides discussed for athletic use are focused on recovery and tissue health rather than direct performance enhancement. Improved recovery can indirectly support better training outcomes.` },
    ];
  } else if (isHealing) {
    summary = `Exploring peptides that may support ${c}? We review the most discussed options, their proposed mechanisms, and what the evidence says.`;
    keyPoints = [
      `BPC-157 and GHK-Cu are among the most commonly discussed peptides for ${c}.`,
      `Most evidence is preclinical, though anecdotal reports are widespread in research communities.`,
      `Sterile preparation, proper dosing, and quality sourcing are critical safety considerations.`,
    ];
    scorecard = [
      { label: "Evidence", value: 5, note: "Strong preclinical interest, limited human trials" },
      { label: "Goal fit", value: 8, note: "Very relevant for healing-focused goals" },
      { label: "Complexity", value: 6, note: "Requires attention to protocol and sourcing" },
      { label: "Caution", value: 7, note: "Research compound status requires care" },
    ];
    blocks = [
      { heading: `Peptides discussed for ${c}`, body: `For ${c}, the peptides most frequently discussed include BPC-157 for tissue repair, GHK-Cu for its regenerative and antioxidant properties, and TB-500 for systemic healing support. Each has a different proposed mechanism and evidence base that may align differently with your specific healing needs.` },
      { heading: `What the research suggests`, body: `Preclinical studies have shown promising results for these peptides in various healing contexts, but large-scale human clinical trials are limited. The existing evidence provides a rationale for their use while also highlighting the need for careful expectations and safety practices.` },
      { heading: `Practical guidance`, body: `If you're exploring peptides for ${c}, focus on sourcing quality, proper storage and administration, and realistic expectations. Healing is a complex biological process, and peptides are best viewed as one potential component of a comprehensive approach.` },
    ];
    decisionChecklist = [
      "Research the specific peptide that matches your healing goal.",
      "Source from established vendors with transparent testing practices.",
      "Follow proper storage, handling, and administration protocols.",
      "Track your progress and adjust based on results.",
    ];
    faqs = [
      { question: `How quickly can I expect healing to improve?`, answer: `Healing timelines vary based on the type and severity of the issue, the peptide chosen, dosage, and individual factors. Some people notice changes within weeks, while others require longer periods.` },
      { question: `Are there any risks with healing peptides?`, answer: `When sourced and administered properly, these peptides are generally well-tolerated. However, as research compounds, they have not undergone FDA approval processes, and long-term safety data is limited.` },
    ];
  } else {
    summary = `Exploring peptides for ${c}? Here's an overview of the most commonly discussed options and what you should know before getting started.`;
    keyPoints = [
      `The most relevant peptides depend on the specific aspect of ${c} you're looking to support.`,
      `Evidence levels vary significantly between different peptides and use cases.`,
      `Sourcing quality, proper protocols, and realistic expectations are essential.`,
    ];
    scorecard = [
      { label: "Evidence", value: 5, note: "Varies by compound and use case" },
      { label: "Goal fit", value: 7, note: "Relevant for the right use case" },
      { label: "Complexity", value: 6, note: "Requires attention to detail" },
      { label: "Caution", value: 7, note: "Research status requires evaluation" },
    ];
    blocks = [
      { heading: `Overview for ${c}`, body: `Several peptides are discussed in relation to ${c}, each with different proposed mechanisms and evidence levels. The most appropriate choice depends on the specific aspects of ${c} you're looking to address and your overall health context.` },
      { heading: `Key considerations`, body: `Before exploring peptides, consider your overall health status, existing medical conditions, and any medications you're taking. Peptides should be approached as research compounds with appropriate caution regarding sourcing, dosing, and monitoring.` },
      { heading: `Next steps`, body: `If you're interested in exploring peptides for ${c}, start by researching the specific compounds most relevant to your goals. Understand their proposed mechanisms, proper protocols, and potential risks before making any decisions.` },
    ];
    decisionChecklist = [
      "Clearly define what aspect of your goal you're trying to address.",
      "Research the specific peptides that align with that goal.",
      "Understand proper dosing, timing, and cycling protocols.",
      "Source from reputable vendors with third-party testing.",
    ];
    faqs = [
      { question: `Which peptide is best for ${c}?`, answer: `The best choice depends on the specific aspect of ${c} you're targeting. Research the mechanisms of different peptides to find the best match for your situation.` },
      { question: `Do I need a doctor's supervision?`, answer: `Medical supervision is recommended, especially if you have existing health conditions or are taking medications. A healthcare professional can help assess risks and monitor your response.` },
    ];
  }

  const path = `/goals/${r.slug}`;
  return { path, title: r.title, summary, keyPoints, scorecard, blocks, decisionChecklist, faqs };
}

// ─── GENERATION ──────────────────────────────────────────────────────────────

const compareEntries = COMPARE_SEEDS.map(r => ({
  slug: r.slug,
  path: `/compare/${r.slug}`,
  title: buildCompareTitle(r.title),
}));

const goalEntries = GOAL_SEEDS.map(r => ({
  slug: r.slug,
  path: `/goals/${r.slug}`,
  title: r.title,
}));

const compareRecords = COMPARE_SEEDS.map(buildCompareContent);
const goalRecords = GOAL_SEEDS.map(buildGoalContent);

const allRecords = [...compareRecords, ...goalRecords];

function readExistingSlugs(): Set<string> {
  const indexPath = path.join(path.resolve(import.meta.dirname, ".."), "shared", "pseoIndex.generated.ts");
  if (!fs.existsSync(indexPath)) return new Set();
  const content = fs.readFileSync(indexPath, "utf-8");
  const slugs = new Set<string>();
  const slugRegex = /"slug":\s*"([^"]+)"/g;
  let m;
  while ((m = slugRegex.exec(content)) !== null) slugs.add(m[1]);
  return slugs;
}

function generateBatchFile(existing: Set<string>) {
  const uniqueRecords = allRecords.filter(r => !existing.has(r.slug || r.path.split("/").pop()!));
  const lines: string[] = [];
  lines.push(`// Auto-generated by scripts/generate-pseo-batch-6.ts`);
  lines.push(`// ${uniqueRecords.length} total pages (${uniqueRecords.filter(r => r.path.startsWith("/compare")).length} compare + ${uniqueRecords.filter(r => r.path.startsWith("/goals")).length} goals)`);
  lines.push(`import type { PseoContentRecord } from "./pseoContent";`);
  lines.push(``);
  lines.push(`export const batch6ContentRecords: Record<string, PseoContentRecord> = {`);

  for (const rec of uniqueRecords) {
    lines.push(`  "${rec.path}": {`);
    lines.push(`    path: "${rec.path}",`);
    lines.push(`    summary: ${JSON.stringify(rec.summary)},`);
    lines.push(`    keyPoints: ${JSON.stringify(rec.keyPoints, null, 6).replace(/\n/g, "\n    ").replace(/\n      \]/g, "\n    ]")},`);
    lines.push(`    scorecard: ${JSON.stringify(rec.scorecard, null, 6).replace(/\n/g, "\n    ").replace(/\n      \]/g, "\n    ]")},`);
    lines.push(`    blocks: [`);
    for (const block of rec.blocks) {
      lines.push(`      { heading: ${JSON.stringify(block.heading)}, body: ${JSON.stringify(block.body)} },`);
    }
    lines.push(`    ],`);
    lines.push(`    decisionChecklist: ${JSON.stringify(rec.decisionChecklist, null, 6).replace(/\n/g, "\n    ").replace(/\n      \]/g, "\n    ]")},`);
    lines.push(`    faqs: ${JSON.stringify(rec.faqs, null, 6).replace(/\n/g, "\n    ").replace(/\n      \]/g, "\n    ]")},`);
    lines.push(`  },`);
  }

  lines.push(`};`);
  return lines.join("\n");
}

function generateIndexEntries(existing: Set<string>) {
  const uniqueCompare = compareEntries.filter(e => !existing.has(e.slug));
  const uniqueGoal = goalEntries.filter(e => !existing.has(e.slug));
  const lines: string[] = [];
  lines.push(`// Auto-generated by scripts/generate-pseo-batch-6.ts`);
  lines.push(`// ${uniqueCompare.length + uniqueGoal.length} total pages`);
  lines.push(``);
  lines.push(`export const batch6CompareEntries = ${JSON.stringify(uniqueCompare, null, 2)};`);
  lines.push(``);
  lines.push(`export const batch6GoalEntries = ${JSON.stringify(uniqueGoal, null, 2)};`);
  return lines.join("\n");
}

const projectRoot = path.resolve(import.meta.dirname, "..");

const existingSlugs = readExistingSlugs();

// Write content batch file
const contentPath = path.join(projectRoot, "shared", "pseoContent-batch-6.ts");
fs.writeFileSync(contentPath, generateBatchFile(existingSlugs));
const uniqueAll = allRecords.filter(r => !existingSlugs.has(r.path.split("/").pop()!));
console.log(`Wrote ${uniqueAll.length} content records to ${contentPath}`);

// Write index entries file
const indexPath = path.join(projectRoot, "shared", "pseoIndex-batch-6.ts");
fs.writeFileSync(indexPath, generateIndexEntries(existingSlugs));
console.log(`Wrote index entries to ${indexPath}`);

const uniqueCompare = compareEntries.filter(e => !existingSlugs.has(e.slug));
const uniqueGoal = goalEntries.filter(e => !existingSlugs.has(e.slug));
console.log(`Done: ${uniqueCompare.length} compare + ${uniqueGoal.length} goals = ${uniqueCompare.length + uniqueGoal.length} unique total`);
