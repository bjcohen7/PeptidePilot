export type PseoSectionKey = "peptides" | "goals" | "compare" | "stacks" | "guides" | "for" | "reviews";

export type PseoEntry = {
  slug: string;
  path: string;
  title: string;
};

export type PseoSection = {
  key: PseoSectionKey;
  label: string;
  path: string;
  description: string;
  entries: PseoEntry[];
};

export const pseoSections = [
  {
    "key": "peptides",
    "label": "Peptide Library",
    "path": "/peptides",
    "description": "Profiles for research peptides and related compounds.",
    "entries": [
      {
        "slug": "bpc-157",
        "path": "/peptides/bpc-157",
        "title": "BPC 157"
      },
      {
        "slug": "tb-500",
        "path": "/peptides/tb-500",
        "title": "TB 500"
      },
      {
        "slug": "ipamorelin",
        "path": "/peptides/ipamorelin",
        "title": "Ipamorelin"
      },
      {
        "slug": "cjc-1295",
        "path": "/peptides/cjc-1295",
        "title": "CJC 1295"
      },
      {
        "slug": "sermorelin",
        "path": "/peptides/sermorelin",
        "title": "Sermorelin"
      },
      {
        "slug": "semaglutide",
        "path": "/peptides/semaglutide",
        "title": "Semaglutide"
      },
      {
        "slug": "tirzepatide",
        "path": "/peptides/tirzepatide",
        "title": "Tirzepatide"
      },
      {
        "slug": "ghk-cu",
        "path": "/peptides/ghk-cu",
        "title": "GHK Cu"
      },
      {
        "slug": "epithalon",
        "path": "/peptides/epithalon",
        "title": "Epithalon"
      },
      {
        "slug": "selank",
        "path": "/peptides/selank",
        "title": "Selank"
      },
      {
        "slug": "semax",
        "path": "/peptides/semax",
        "title": "Semax"
      },
      {
        "slug": "pt-141",
        "path": "/peptides/pt-141",
        "title": "PT 141"
      }
    ]
  },
  {
    "key": "goals",
    "label": "Goals",
    "path": "/goals",
    "description": "Find peptides by health goal and outcome.",
    "entries": [
      {
        "slug": "muscle-growth",
        "path": "/goals/muscle-growth",
        "title": "Peptides for Muscle Growth"
      },
      {
        "slug": "fat-loss",
        "path": "/goals/fat-loss",
        "title": "Peptides for Fat Loss"
      },
      {
        "slug": "joint-recovery",
        "path": "/goals/joint-recovery",
        "title": "Peptides for Joint Recovery"
      },
      {
        "slug": "gut-health",
        "path": "/goals/gut-health",
        "title": "Peptides for Gut Health"
      },
      {
        "slug": "anti-aging",
        "path": "/goals/anti-aging",
        "title": "Peptides for Anti Aging"
      },
      {
        "slug": "sleep-optimization",
        "path": "/goals/sleep-optimization",
        "title": "Peptides for Sleep Optimization"
      },
      {
        "slug": "cognitive-performance",
        "path": "/goals/cognitive-performance",
        "title": "Peptides for Cognitive Performance"
      },
      {
        "slug": "anxiety-reduction",
        "path": "/goals/anxiety-reduction",
        "title": "Peptides for Anxiety Reduction"
      },
      {
        "slug": "skin-health",
        "path": "/goals/skin-health",
        "title": "Peptides for Skin Health"
      },
      {
        "slug": "hair-growth",
        "path": "/goals/hair-growth",
        "title": "Peptides for Hair Growth"
      },
      {
        "slug": "longevity",
        "path": "/goals/longevity",
        "title": "Peptides for Longevity"
      },
      {
        "slug": "body-recomposition",
        "path": "/goals/body-recomposition",
        "title": "Peptides for Body Recomposition"
      },
      {
        "slug": "injury-recovery",
        "path": "/goals/injury-recovery",
        "title": "Peptides for Injury Recovery"
      },
      {
        "slug": "energy",
        "path": "/goals/energy",
        "title": "Peptides for Energy"
      },
      {
        "slug": "libido",
        "path": "/goals/libido",
        "title": "Peptides for Libido"
      },
      {
        "slug": "inflammation",
        "path": "/goals/inflammation",
        "title": "Peptides for Inflammation"
      },
      {
        "slug": "metabolic-health",
        "path": "/goals/metabolic-health",
        "title": "Peptides for Metabolic Health"
      },
      {
        "slug": "muscle-recovery",
        "path": "/goals/muscle-recovery",
        "title": "Peptides for Muscle Recovery"
      }
    ]
  },
  {
    "key": "compare",
    "label": "Compare",
    "path": "/compare",
    "description": "Head-to-head peptide and medication comparisons.",
    "entries": [
      {
        "slug": "bpc-157-vs-tb-500",
        "path": "/compare/bpc-157-vs-tb-500",
        "title": "BPC 157 vs TB 500"
      },
      {
        "slug": "semaglutide-vs-tirzepatide",
        "path": "/compare/semaglutide-vs-tirzepatide",
        "title": "Semaglutide vs Tirzepatide"
      },
      {
        "slug": "ipamorelin-vs-cjc-1295",
        "path": "/compare/ipamorelin-vs-cjc-1295",
        "title": "Ipamorelin vs CJC 1295"
      },
      {
        "slug": "ozempic-vs-wegovy",
        "path": "/compare/ozempic-vs-wegovy",
        "title": "Ozempic vs Wegovy"
      },
      {
        "slug": "mounjaro-vs-zepbound",
        "path": "/compare/mounjaro-vs-zepbound",
        "title": "Mounjaro vs Zepbound"
      },
      {
        "slug": "selank-vs-semax",
        "path": "/compare/selank-vs-semax",
        "title": "Selank vs Semax"
      },
      {
        "slug": "epithalon-vs-ghk-cu",
        "path": "/compare/epithalon-vs-ghk-cu",
        "title": "Epithalon vs GHK Cu"
      },
      {
        "slug": "sermorelin-vs-ipamorelin",
        "path": "/compare/sermorelin-vs-ipamorelin",
        "title": "Sermorelin vs Ipamorelin"
      },
      {
        "slug": "bpc-157-vs-ghk-cu",
        "path": "/compare/bpc-157-vs-ghk-cu",
        "title": "BPC 157 vs GHK Cu"
      },
      {
        "slug": "tb-500-vs-ghk-cu",
        "path": "/compare/tb-500-vs-ghk-cu",
        "title": "TB 500 vs GHK Cu"
      },
      {
        "slug": "tesamorelin-vs-ipamorelin",
        "path": "/compare/tesamorelin-vs-ipamorelin",
        "title": "Tesamorelin vs Ipamorelin"
      },
      {
        "slug": "semaglutide-vs-retatrutide",
        "path": "/compare/semaglutide-vs-retatrutide",
        "title": "Semaglutide vs Retatrutide"
      },
      {
        "slug": "aod-9604-vs-semaglutide",
        "path": "/compare/aod-9604-vs-semaglutide",
        "title": "AOD 9604 vs Semaglutide"
      },
      {
        "slug": "cjc-1295-vs-ghrp-6",
        "path": "/compare/cjc-1295-vs-ghrp-6",
        "title": "CJC 1295 vs GHRP 6"
      },
      {
        "slug": "pt-141-vs-kisspeptin",
        "path": "/compare/pt-141-vs-kisspeptin",
        "title": "PT 141 vs Kisspeptin"
      },
      {
        "slug": "semaglutide-vs-liraglutide",
        "path": "/compare/semaglutide-vs-liraglutide",
        "title": "Semaglutide vs Liraglutide"
      },
      {
        "slug": "mots-c-vs-nad",
        "path": "/compare/mots-c-vs-nad",
        "title": "Mots C vs NAD+"
      },
      {
        "slug": "ozempic-vs-mounjaro",
        "path": "/compare/ozempic-vs-mounjaro",
        "title": "Ozempic vs Mounjaro"
      },
      {
        "slug": "ozempic-vs-saxenda",
        "path": "/compare/ozempic-vs-saxenda",
        "title": "Ozempic vs Saxenda"
      },
      {
        "slug": "wegovy-vs-mounjaro",
        "path": "/compare/wegovy-vs-mounjaro",
        "title": "Wegovy vs Mounjaro"
      },
      {
        "slug": "wegovy-vs-saxenda",
        "path": "/compare/wegovy-vs-saxenda",
        "title": "Wegovy vs Saxenda"
      },
      {
        "slug": "tirzepatide-vs-retatrutide",
        "path": "/compare/tirzepatide-vs-retatrutide",
        "title": "Tirzepatide vs Retatrutide"
      },
      {
        "slug": "ozempic-vs-rybelsus",
        "path": "/compare/ozempic-vs-rybelsus",
        "title": "Ozempic vs Rybelsus"
      },
      {
        "slug": "trulicity-vs-ozempic",
        "path": "/compare/trulicity-vs-ozempic",
        "title": "Trulicity vs Ozempic"
      },
      {
        "slug": "victoza-vs-ozempic",
        "path": "/compare/victoza-vs-ozempic",
        "title": "Victoza vs Ozempic"
      },
      {
        "slug": "ipamorelin-vs-sermorelin",
        "path": "/compare/ipamorelin-vs-sermorelin",
        "title": "Ipamorelin vs Sermorelin"
      },
      {
        "slug": "cjc-1295-vs-sermorelin",
        "path": "/compare/cjc-1295-vs-sermorelin",
        "title": "CJC 1295 vs Sermorelin"
      },
      {
        "slug": "ghrp-6-vs-ghrp-2",
        "path": "/compare/ghrp-6-vs-ghrp-2",
        "title": "GHRP 6 vs GHRP 2"
      },
      {
        "slug": "ipamorelin-vs-ghrp-6",
        "path": "/compare/ipamorelin-vs-ghrp-6",
        "title": "Ipamorelin vs GHRP 6"
      },
      {
        "slug": "ipamorelin-vs-ghrp-2",
        "path": "/compare/ipamorelin-vs-ghrp-2",
        "title": "Ipamorelin vs GHRP 2"
      },
      {
        "slug": "hexarelin-vs-ipamorelin",
        "path": "/compare/hexarelin-vs-ipamorelin",
        "title": "Hexarelin vs Ipamorelin"
      },
      {
        "slug": "tesamorelin-vs-sermorelin",
        "path": "/compare/tesamorelin-vs-sermorelin",
        "title": "Tesamorelin vs Sermorelin"
      },
      {
        "slug": "cjc-1295-dac-vs-no-dac",
        "path": "/compare/cjc-1295-dac-vs-no-dac",
        "title": "CJC 1295 DAC vs No DAC"
      },
      {
        "slug": "sermorelin-vs-hgh",
        "path": "/compare/sermorelin-vs-hgh",
        "title": "Sermorelin vs HGH"
      },
      {
        "slug": "ipamorelin-vs-hgh",
        "path": "/compare/ipamorelin-vs-hgh",
        "title": "Ipamorelin vs HGH"
      },
      {
        "slug": "bpc-157-vs-ipamorelin",
        "path": "/compare/bpc-157-vs-ipamorelin",
        "title": "BPC 157 vs Ipamorelin"
      },
      {
        "slug": "epithalon-vs-nad",
        "path": "/compare/epithalon-vs-nad",
        "title": "Epithalon vs NAD+"
      },
      {
        "slug": "ghk-cu-vs-nad",
        "path": "/compare/ghk-cu-vs-nad",
        "title": "GHK Cu vs NAD+"
      },
      {
        "slug": "nad-vs-nmn",
        "path": "/compare/nad-vs-nmn",
        "title": "NAD+ vs NMN"
      },
      {
        "slug": "nad-vs-niacin",
        "path": "/compare/nad-vs-niacin",
        "title": "NAD+ vs Niacin"
      },
      {
        "slug": "selank-vs-semax-anxiety",
        "path": "/compare/selank-vs-semax-anxiety",
        "title": "Selank vs Semax Anxiety"
      },
      {
        "slug": "semax-vs-dihexa",
        "path": "/compare/semax-vs-dihexa",
        "title": "Semax vs Dihexa"
      },
      {
        "slug": "pt-141-vs-tadalafil",
        "path": "/compare/pt-141-vs-tadalafil",
        "title": "PT 141 vs Tadalafil"
      },
      {
        "slug": "pt-141-vs-sildenafil",
        "path": "/compare/pt-141-vs-sildenafil",
        "title": "PT 141 vs Sildenafil"
      },
      {
        "slug": "melanotan-2-vs-pt-141",
        "path": "/compare/melanotan-2-vs-pt-141",
        "title": "Melanotan 2 vs PT 141"
      },
      {
        "slug": "ghk-cu-vs-retinol",
        "path": "/compare/ghk-cu-vs-retinol",
        "title": "GHK Cu vs Retinol"
      },
      {
        "slug": "ghk-cu-vs-hyaluronic-acid",
        "path": "/compare/ghk-cu-vs-hyaluronic-acid",
        "title": "GHK Cu vs Hyaluronic Acid"
      },
      {
        "slug": "ghk-cu-vs-minoxidil",
        "path": "/compare/ghk-cu-vs-minoxidil",
        "title": "GHK Cu vs Minoxidil"
      },
      {
        "slug": "bpc-157-vs-minoxidil",
        "path": "/compare/bpc-157-vs-minoxidil",
        "title": "BPC 157 vs Minoxidil"
      },
      {
        "slug": "thymosin-alpha-1-vs-ll-37",
        "path": "/compare/thymosin-alpha-1-vs-ll-37",
        "title": "Thymosin Alpha 1 vs LL 37"
      },
      {
        "slug": "thymosin-alpha-1-vs-bpc-157",
        "path": "/compare/thymosin-alpha-1-vs-bpc-157",
        "title": "Thymosin Alpha 1 vs BPC 157"
      },
      {
        "slug": "ll-37-vs-bpc-157",
        "path": "/compare/ll-37-vs-bpc-157",
        "title": "LL 37 vs BPC 157"
      },
      {
        "slug": "snap-8-vs-argireline",
        "path": "/compare/snap-8-vs-argireline",
        "title": "SNAP 8 vs Argireline"
      },
      {
        "slug": "ghk-cu-vs-argireline",
        "path": "/compare/ghk-cu-vs-argireline",
        "title": "GHK Cu vs Argireline"
      },
      {
        "slug": "semaglutide-vs-orforglipron",
        "path": "/compare/semaglutide-vs-orforglipron",
        "title": "Semaglutide vs Orforglipron"
      },
      {
        "slug": "aod-9604-vs-tirzepatide",
        "path": "/compare/aod-9604-vs-tirzepatide",
        "title": "AOD 9604 vs Tirzepatide"
      },
      {
        "slug": "oxytocin-vs-kisspeptin",
        "path": "/compare/oxytocin-vs-kisspeptin",
        "title": "Oxytocin vs Kisspeptin"
      },
      {
        "slug": "pt-141-vs-oxytocin",
        "path": "/compare/pt-141-vs-oxytocin",
        "title": "PT 141 vs Oxytocin"
      },
      {
        "slug": "kisspeptin-vs-pt-141",
        "path": "/compare/kisspeptin-vs-pt-141",
        "title": "Kisspeptin vs PT 141"
      },
      {
        "slug": "dsip-vs-selank",
        "path": "/compare/dsip-vs-selank",
        "title": "DSIP vs Selank"
      },
      {
        "slug": "dsip-vs-ipamorelin",
        "path": "/compare/dsip-vs-ipamorelin",
        "title": "DSIP vs Ipamorelin"
      },
      {
        "slug": "cerebrolysin-vs-dihexa",
        "path": "/compare/cerebrolysin-vs-dihexa",
        "title": "Cerebrolysin vs Dihexa"
      },
      {
        "slug": "cerebrolysin-vs-semax",
        "path": "/compare/cerebrolysin-vs-semax",
        "title": "Cerebrolysin vs Semax"
      },
      {
        "slug": "bpc-157-vs-glutamine",
        "path": "/compare/bpc-157-vs-glutamine",
        "title": "BPC 157 vs Glutamine"
      },
      {
        "slug": "bpc-157-vs-zinc-carnosine",
        "path": "/compare/bpc-157-vs-zinc-carnosine",
        "title": "BPC 157 vs Zinc Carnosine"
      },
      {
        "slug": "tb-500-vs-ipamorelin",
        "path": "/compare/tb-500-vs-ipamorelin",
        "title": "TB 500 vs Ipamorelin"
      },
      {
        "slug": "bpc-157-vs-nac",
        "path": "/compare/bpc-157-vs-nac",
        "title": "BPC 157 vs NAC"
      },
      {
        "slug": "ghk-cu-vs-epithalon",
        "path": "/compare/ghk-cu-vs-epithalon",
        "title": "GHK Cu vs Epithalon"
      },
      {
        "slug": "mots-c-vs-humanin",
        "path": "/compare/mots-c-vs-humanin",
        "title": "Mots C vs Humanin"
      },
      {
        "slug": "ipamorelin-vs-mk-677",
        "path": "/compare/ipamorelin-vs-mk-677",
        "title": "Ipamorelin vs MK 677"
      }
    ]
  },
  {
    "key": "stacks",
    "label": "Stacks",
    "path": "/stacks",
    "description": "Curated peptide protocol concepts.",
    "entries": [
      {
        "slug": "recovery-stack",
        "path": "/stacks/recovery-stack",
        "title": "Recovery Stack"
      },
      {
        "slug": "gh-optimization-stack",
        "path": "/stacks/gh-optimization-stack",
        "title": "Gh Optimization Stack"
      },
      {
        "slug": "anti-aging-stack",
        "path": "/stacks/anti-aging-stack",
        "title": "Anti Aging Stack"
      },
      {
        "slug": "metabolic-stack",
        "path": "/stacks/metabolic-stack",
        "title": "Metabolic Stack"
      },
      {
        "slug": "cognitive-stack",
        "path": "/stacks/cognitive-stack",
        "title": "Cognitive Stack"
      },
      {
        "slug": "wolverine-stack",
        "path": "/stacks/wolverine-stack",
        "title": "Wolverine Stack"
      }
    ]
  },
  {
    "key": "guides",
    "label": "Guides",
    "path": "/guides",
    "description": "How-to guides for safer research and decision-making.",
    "entries": [
      {
        "slug": "how-to-reconstitute-peptides",
        "path": "/guides/how-to-reconstitute-peptides",
        "title": "How To Reconstitute Peptides"
      },
      {
        "slug": "how-to-inject-peptides-subcutaneously",
        "path": "/guides/how-to-inject-peptides-subcutaneously",
        "title": "How To Inject Peptides Subcutaneously"
      },
      {
        "slug": "how-to-calculate-peptide-dosage",
        "path": "/guides/how-to-calculate-peptide-dosage",
        "title": "How To Calculate Peptide Dosage"
      },
      {
        "slug": "how-to-store-peptides",
        "path": "/guides/how-to-store-peptides",
        "title": "How To Store Peptides"
      },
      {
        "slug": "how-to-use-bpc-157-for-gut-healing",
        "path": "/guides/how-to-use-bpc-157-for-gut-healing",
        "title": "How To Use BPC 157 For Gut Healing"
      },
      {
        "slug": "how-to-inject-subcutaneously",
        "path": "/guides/how-to-inject-subcutaneously",
        "title": "How To Inject Subcutaneously"
      },
      {
        "slug": "how-to-use-ipamorelin",
        "path": "/guides/how-to-use-ipamorelin",
        "title": "How To Use Ipamorelin"
      },
      {
        "slug": "how-to-use-sermorelin",
        "path": "/guides/how-to-use-sermorelin",
        "title": "How To Use Sermorelin"
      },
      {
        "slug": "how-to-use-tb-500",
        "path": "/guides/how-to-use-tb-500",
        "title": "How To Use TB 500"
      },
      {
        "slug": "how-to-use-nad-plus",
        "path": "/guides/how-to-use-nad-plus",
        "title": "How To Use NAD+"
      },
      {
        "slug": "how-to-use-ghk-cu",
        "path": "/guides/how-to-use-ghk-cu",
        "title": "How To Use GHK Cu"
      },
      {
        "slug": "how-to-use-epithalon",
        "path": "/guides/how-to-use-epithalon",
        "title": "How To Use Epithalon"
      },
      {
        "slug": "how-to-use-pt-141",
        "path": "/guides/how-to-use-pt-141",
        "title": "How To Use PT 141"
      },
      {
        "slug": "how-to-use-cjc-1295",
        "path": "/guides/how-to-use-cjc-1295",
        "title": "How To Use CJC 1295"
      },
      {
        "slug": "how-to-use-semaglutide",
        "path": "/guides/how-to-use-semaglutide",
        "title": "How To Use Semaglutide"
      },
      {
        "slug": "how-to-use-tirzepatide",
        "path": "/guides/how-to-use-tirzepatide",
        "title": "How To Use Tirzepatide"
      },
      {
        "slug": "how-to-use-melanotan-2",
        "path": "/guides/how-to-use-melanotan-2",
        "title": "How To Use Melanotan 2"
      },
      {
        "slug": "how-to-use-thymosin-alpha-1",
        "path": "/guides/how-to-use-thymosin-alpha-1",
        "title": "How To Use Thymosin Alpha 1"
      },
      {
        "slug": "how-to-read-a-peptide-coa",
        "path": "/guides/how-to-read-a-peptide-coa",
        "title": "How To Read A Peptide COA"
      },
      {
        "slug": "how-to-choose-a-peptide-vendor",
        "path": "/guides/how-to-choose-a-peptide-vendor",
        "title": "How To Choose A Peptide Vendor"
      },
      {
        "slug": "how-to-build-a-peptide-stack",
        "path": "/guides/how-to-build-a-peptide-stack",
        "title": "How To Build A Peptide Stack"
      },
      {
        "slug": "how-to-cycle-peptides",
        "path": "/guides/how-to-cycle-peptides",
        "title": "How To Cycle Peptides"
      },
      {
        "slug": "how-to-use-peptides-for-fat-loss",
        "path": "/guides/how-to-use-peptides-for-fat-loss",
        "title": "How To Use Peptides For Fat Loss"
      },
      {
        "slug": "how-to-use-peptides-for-muscle-growth",
        "path": "/guides/how-to-use-peptides-for-muscle-growth",
        "title": "How To Use Peptides For Muscle Growth"
      },
      {
        "slug": "how-to-use-peptides-for-sleep",
        "path": "/guides/how-to-use-peptides-for-sleep",
        "title": "How To Use Peptides For Sleep"
      },
      {
        "slug": "how-to-use-peptides-for-anti-aging",
        "path": "/guides/how-to-use-peptides-for-anti-aging",
        "title": "How To Use Peptides For Anti Aging"
      },
      {
        "slug": "how-to-use-peptides-for-injury-recovery",
        "path": "/guides/how-to-use-peptides-for-injury-recovery",
        "title": "How To Use Peptides For Injury Recovery"
      }
    ]
  },
  {
    "key": "for",
    "label": "For",
    "path": "/for",
    "description": "Condition and symptom-focused peptide research pages.",
    "entries": [
      {
        "slug": "leaky-gut",
        "path": "/for/leaky-gut",
        "title": "Peptides for Leaky Gut"
      },
      {
        "slug": "joint-pain",
        "path": "/for/joint-pain",
        "title": "Peptides for Joint Pain"
      },
      {
        "slug": "low-testosterone",
        "path": "/for/low-testosterone",
        "title": "Peptides for Low Testosterone"
      },
      {
        "slug": "anxiety",
        "path": "/for/anxiety",
        "title": "Peptides for Anxiety"
      },
      {
        "slug": "poor-sleep",
        "path": "/for/poor-sleep",
        "title": "Peptides for Poor Sleep"
      },
      {
        "slug": "tendinopathy",
        "path": "/for/tendinopathy",
        "title": "Peptides for Tendinopathy"
      },
      {
        "slug": "chronic-fatigue",
        "path": "/for/chronic-fatigue",
        "title": "Peptides for Chronic Fatigue"
      },
      {
        "slug": "depression",
        "path": "/for/depression",
        "title": "Peptides for Depression"
      },
      {
        "slug": "osteoporosis",
        "path": "/for/osteoporosis",
        "title": "Peptides for Osteoporosis"
      },
      {
        "slug": "erectile-dysfunction",
        "path": "/for/erectile-dysfunction",
        "title": "Peptides for Erectile Dysfunction"
      },
      {
        "slug": "hair-loss",
        "path": "/for/hair-loss",
        "title": "Peptides for Hair Loss"
      },
      {
        "slug": "skin-aging",
        "path": "/for/skin-aging",
        "title": "Peptides for Skin Aging"
      },
      {
        "slug": "obesity",
        "path": "/for/obesity",
        "title": "Peptides for Obesity"
      },
      {
        "slug": "type-2-diabetes",
        "path": "/for/type-2-diabetes",
        "title": "Peptides for Type 2 Diabetes"
      },
      {
        "slug": "cognitive-decline",
        "path": "/for/cognitive-decline",
        "title": "Peptides for Cognitive Decline"
      },
      {
        "slug": "wound-healing",
        "path": "/for/wound-healing",
        "title": "Peptides for Wound Healing"
      },
      {
        "slug": "autoimmune-disease",
        "path": "/for/autoimmune-disease",
        "title": "Peptides for Autoimmune Disease"
      },
      {
        "slug": "insomnia",
        "path": "/for/insomnia",
        "title": "Peptides for Insomnia"
      }
    ]
  },
  {
    "key": "reviews",
    "label": "Reviews",
    "path": "/reviews",
    "description": "Independent peptide and vendor-style review pages.",
    "entries": [
      {
        "slug": "bpc-157-review",
        "path": "/reviews/bpc-157-review",
        "title": "BPC 157 Review"
      },
      {
        "slug": "ipamorelin-cjc-1295-review",
        "path": "/reviews/ipamorelin-cjc-1295-review",
        "title": "Ipamorelin CJC 1295 Review"
      },
      {
        "slug": "semaglutide-review",
        "path": "/reviews/semaglutide-review",
        "title": "Semaglutide Review"
      },
      {
        "slug": "tb-500-review",
        "path": "/reviews/tb-500-review",
        "title": "TB 500 Review"
      },
      {
        "slug": "ghk-cu-review",
        "path": "/reviews/ghk-cu-review",
        "title": "GHK Cu Review"
      },
      {
        "slug": "ipamorelin-review",
        "path": "/reviews/ipamorelin-review",
        "title": "Ipamorelin Review"
      },
      {
        "slug": "tirzepatide-review",
        "path": "/reviews/tirzepatide-review",
        "title": "Tirzepatide Review"
      },
      {
        "slug": "sermorelin-review",
        "path": "/reviews/sermorelin-review",
        "title": "Sermorelin Review"
      },
      {
        "slug": "nad-plus-review",
        "path": "/reviews/nad-plus-review",
        "title": "NAD+ Review"
      },
      {
        "slug": "epithalon-review",
        "path": "/reviews/epithalon-review",
        "title": "Epithalon Review"
      },
      {
        "slug": "pt-141-review",
        "path": "/reviews/pt-141-review",
        "title": "PT 141 Review"
      },
      {
        "slug": "cjc-1295-review",
        "path": "/reviews/cjc-1295-review",
        "title": "CJC 1295 Review"
      },
      {
        "slug": "thymosin-alpha-1-review",
        "path": "/reviews/thymosin-alpha-1-review",
        "title": "Thymosin Alpha 1 Review"
      },
      {
        "slug": "melanotan-2-review",
        "path": "/reviews/melanotan-2-review",
        "title": "Melanotan 2 Review"
      },
      {
        "slug": "selank-review",
        "path": "/reviews/selank-review",
        "title": "Selank Review"
      },
      {
        "slug": "semax-review",
        "path": "/reviews/semax-review",
        "title": "Semax Review"
      }
    ]
  }
] as const satisfies readonly PseoSection[];

export const pseoEntries = pseoSections.flatMap((section) =>
  section.entries.map((entry) => ({ ...entry, sectionKey: section.key }))
);

export function getPseoSection(key: string) {
  return pseoSections.find((section) => section.key === key);
}

export function getPseoEntry(sectionKey: string, slug: string) {
  const section = getPseoSection(sectionKey);
  const entry = section?.entries.find((item) => item.slug === slug);
  return section && entry ? { section, entry } : null;
}
