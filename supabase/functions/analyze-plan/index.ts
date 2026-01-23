import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base de données des prix Québec 2025
const PRIX_QUEBEC_2025 = {
  bois: {
    "2x4x8_SPF": 4.50,
    "2x6x8_SPF": 7.25,
    "2x8x12_SPF": 16.80,
    "contreplaque_3_4_4x8": 52.00,
    "OSB_7_16_4x8": 24.50,
  },
  gypse: {
    "regulier_1_2_4x8": 18.50,
    "resistant_1_2_4x8": 22.00,
  },
  isolation: {
    // Laine minérale
    "laine_minerale_R20_pi2": 1.00,
    // Cellulose soufflée
    "cellulose_R40_pi2_min": 0.85,
    "cellulose_R40_pi2_max": 0.90,
    "cellulose_R50_pi2_min": 0.95,
    "cellulose_R50_pi2_max": 1.00,
    "cellulose_R60_pi2_min": 1.00,
    "cellulose_R60_pi2_max": 1.50,
    // Uréthane giclé
    "urethane_1pouce_pi2_min": 3.00,
    "urethane_1pouce_pi2_max": 4.00,
    "urethane_2pouces_pi2_min": 4.00,
    "urethane_2pouces_pi2_max": 5.00,
    "urethane_3pouces_pi2_min": 5.00,
    "urethane_3pouces_pi2_max": 7.00,
    // Coffrage isolant (ICF) - coût total mur par pi²
    "coffrage_isolant_R22_R32_pi2_min": 140.00,
    "coffrage_isolant_R22_R32_pi2_max": 230.00,
  },
  toiture: {
    // Toits en pente - Prix au pi² installation incluse
    "bardeau_asphalte_pi2_min": 3.00,
    "bardeau_asphalte_pi2_max": 12.00, // Durée de vie: 15-30 ans
    "tole_metal_pi2_min": 10.00,
    "tole_metal_pi2_max": 30.00, // Durée de vie: 50+ ans
    // Toits plats - Prix au pi² installation incluse
    "membrane_elastomere_pi2_min": 11.00,
    "membrane_elastomere_pi2_max": 25.00, // Durée de vie: 25-35 ans
    "membrane_TPO_pi2_min": 11.00,
    "membrane_TPO_pi2_max": 22.00, // Durée de vie: 20-30 ans
    "membrane_EPDM_pi2_min": 11.00,
    "membrane_EPDM_pi2_max": 25.00, // Durée de vie: 20-25 ans
    // Autres
    "membrane_Tyvek_pi2": 0.42,
    "retrait_ancien_revetement_pi2_min": 2.00,
    "retrait_ancien_revetement_pi2_max": 5.00,
  },
  beton: {
    "ciment_portland_30kg": 12.50,
    // === PRIX BÉTON PAR M³ (2025) ===
    "beton_20MPA_sans_air_m3": 226.00,
    "beton_20MPA_avec_air_m3": 233.00,
    "beton_25MPA_sans_air_m3": 236.00,
    "beton_25MPA_avec_air_m3": 243.00,
    "beton_30MPA_sans_air_m3": 246.00,
    "beton_30MPA_avec_air_m3": 253.00,
    "beton_32MPA_sans_air_m3": 256.00,
    "beton_32MPA_avec_air_m3": 263.00,
    "beton_35MPA_sans_air_m3": 266.00,
    "beton_35MPA_avec_air_m3": 273.00,
    "beton_piscine_fond_m3": 246.00,
    "beton_remblai_m3": 202.00,
    "air_entraine_par_m3": 7.00,
    // === FINITION ET MISE EN PLACE (par pi²) ===
    "finition_truelle_pi2": 2.50,
    "finition_truelle_min": 1500.00,
    "finition_helicoptere_pi2": 3.25,
    "finition_helicoptere_min": 1700.00,
    "finition_estampage_pi2": 5.00,
    "finition_estampage_min": 2500.00,
    "scellant_mac_5gal": 305.00,
    // === MANUTENTION ET POMPAGE ===
    "manutention_4m_moins": 460.00,
    "location_pompe_4h_min": 710.00,
    "pompe_heure_supp": 150.00,
    "sac_lavage": 110.00,
    "lavage_usine": 110.00,
    // === TEMPS ALLOUÉ PAR VOLUME ===
    "temps_supp_minute": 3.00,
    "taux_horaire_camion": 190.00,
    // === ADDITIFS ===
    "fibre_m3": 44.50,
    "calcium_m3": 40.00,
    "retardant_m3": 40.00,
    "couleur_pale_m3": 110.00,
    "couleur_fonce_m3": 160.00,
    // === LIVRAISON SAMEDI ===
    "extra_samedi_camion": 150.00,
    // === FRAIS DE LIVRAISON PAR ZONE ===
    // Zone Laval
    "livraison_laval_base": 250.00,
    "livraison_laval_vimont": 260.00,
    "livraison_laval_fabreville": 275.00,
    "livraison_laval_ouest": 300.00,
    // Zone Montréal
    "livraison_montreal_est": 250.00,
    "livraison_montreal_nord": 275.00,
    "livraison_montreal_ouest": 350.00,
    "livraison_rive_sud": 360.00,
    // Zone Lanaudière
    "livraison_lanaudiere_proche": 220.00,
    "livraison_lanaudiere_moyen": 250.00,
    "livraison_lanaudiere_loin": 335.00,
    // Achat minimum
    "achat_minimum_base": 750.00,
  },
  fondation: {
    // Coûts par pi² selon le type de fondation
    "beton_coule_pi2_min": 14.00,
    "beton_coule_pi2_max": 20.00,
    "blocs_beton_pi2_min": 10.00,
    "blocs_beton_pi2_max": 15.00,
    "dalle_sur_sol_pi2_min": 6.50,
    "dalle_sur_sol_pi2_max": 11.00,
    "vide_sanitaire_pi2_min": 12.00,
    "vide_sanitaire_pi2_max": 18.00,
    "sous_sol_complet_pi2_min": 18.00,
    "sous_sol_complet_pi2_max": 25.00,
    // Coffrage et béton coulé détaillé
    "coffrage_beton_coule_pi2_min": 14.42,
    "coffrage_beton_coule_pi2_max": 20.60,
    // Semelles de fondation (par pied linéaire)
    "semelles_pi_lineaire_min": 10.00,
    "semelles_pi_lineaire_max": 15.00, // Inclut excavation, béton et armature acier
  },
  excavation: {
    // Coûts au m³ incluant opérateur, transport et matériel de remblai
    "standard_m3": 200.00, // Moyenne pour agrandissement standard
    "sol_mou_argileux_m3_min": 125.00,
    "sol_rocailleux_m3_max": 500.00,
    "disposition_terre_m3_min": 25.00,
    "disposition_terre_m3_max": 75.00,
    "gestion_eaux_souterraines_m3": 75.00, // 50-100$ moyenne
    // Tarifs horaires
    "taux_horaire_pelle_standard": 160.00,
    "taux_horaire_marteau_piqueur": 250.00,
    // Coûts supplémentaires
    "dynamitage_roc_forfait_min": 5000.00,
    "dynamitage_roc_forfait_max": 10000.00,
    "majoration_hiver_pourcent": 40, // 30-50% moyenne
  },
  fenetres_portes: {
    // === FENÊTRES PAR TYPE ET DIMENSION ===
    // PVC Standard (blanc/blanc)
    "fenetre_pvc_coulissante_petit_pi2": 25.00, // < 15 pi²
    "fenetre_pvc_coulissante_moyen_pi2": 22.00, // 15-25 pi²
    "fenetre_pvc_coulissante_grand_pi2": 20.00, // > 25 pi²
    "fenetre_pvc_battant_petit_pi2": 35.00, // < 10 pi²
    "fenetre_pvc_battant_moyen_pi2": 30.00, // 10-20 pi²
    "fenetre_pvc_battant_grand_pi2": 28.00, // > 20 pi²
    // Hybride (aluminium ext/PVC int) - Premium
    "fenetre_hybride_battant_petit_pi2": 55.00, // < 10 pi²
    "fenetre_hybride_battant_moyen_pi2": 50.00, // 10-20 pi²
    "fenetre_hybride_battant_grand_pi2": 45.00, // > 20 pi²
    "fenetre_hybride_auvent_pi2": 60.00,
    // Aluminium pur (commercial/moderne)
    "fenetre_aluminium_fixe_pi2": 40.00,
    "fenetre_aluminium_coulissante_pi2": 45.00,
    
    // === OPTIONS DE VITRAGE ===
    "vitrage_double_lowE_argon_base": 0.00, // Inclus dans prix de base
    "vitrage_triple_lowE_argon_majoration_pourcent": 25, // +25%
    "vitrage_triple_krypton_majoration_pourcent": 40, // +40%
    
    // === OPTIONS COULEUR ===
    "couleur_blanc_blanc_base": 0.00, // Standard
    "couleur_noir_blanc_majoration": 150.00, // Par fenêtre
    "couleur_bronze_blanc_majoration": 175.00,
    "couleur_custom_majoration": 250.00,
    
    // === CARRELAGE / GRILLES DÉCORATIVES ===
    "carrelage_colonial_par_fenetre": 75.00,
    "carrelage_rectangulaire_par_fenetre": 100.00,
    "separateur_integre_par_fenetre": 125.00,
    
    // === CERTIFICATIONS ===
    "certification_energy_star_inclus": true,
    "sortie_urgence_egress_majoration": 50.00,
    
    // === PORTES EXTÉRIEURES ===
    "porte_simple_acier_base": 800.00,
    "porte_simple_fibre_verre": 1200.00,
    "porte_simple_bois_massif": 2500.00,
    "porte_double_acier": 1800.00,
    "porte_double_fibre_verre": 2800.00,
    "porte_patio_coulissante_6pi": 1500.00,
    "porte_patio_coulissante_8pi": 2200.00,
    "porte_patio_francaise": 3500.00,
    "porte_garage_simple_9x7": 1200.00,
    "porte_garage_double_16x7": 2000.00,
    "porte_garage_isolee_majoration": 400.00,
    
    // === OPTIONS PORTES ===
    "insertion_verre_demi_vitre": 350.00,
    "insertion_verre_pleine_vitre": 600.00,
    "cadrage_aluminium_contemporain": 200.00,
    "seuil_ajustable_premium": 150.00,
    "quincaillerie_nickel_satine": 100.00,
    "quincaillerie_noir_mat": 125.00,
    
    // === PORTES INTÉRIEURES ===
    "porte_interieure_creuse": 150.00,
    "porte_interieure_ame_pleine": 250.00,
    "porte_interieure_mdf_moulure": 300.00,
    "porte_francaise_interieure": 450.00,
    "porte_coulissante_grange": 600.00,
    "cadrage_porte_interieure": 75.00,
    
    // === INSTALLATION ===
    "installation_fenetre_par_unite": 150.00,
    "installation_porte_exterieure": 300.00,
    "installation_porte_interieure": 100.00,
  },
  plomberie: {
    // === COÛTS GLOBAUX CONSTRUCTION NEUVE ===
    "rough_in_maison_1000_2000pi2_min": 5000.00,
    "rough_in_maison_1000_2000pi2_max": 6000.00,
    "finition_plomberie_min": 5500.00,
    "total_maison_neuve_min": 10000.00,
    "total_maison_neuve_max": 15000.00,
    // === PAR APPAREIL (main-d'œuvre + tuyauterie) ===
    "toilette_wc_min": 800.00,
    "toilette_wc_max": 1300.00,
    "lavabo_evier_sdb_min": 800.00,
    "lavabo_evier_sdb_max": 1300.00,
    "douche_bain_base_min": 1200.00,
    "douche_bain_base_max": 2000.00,
    "lave_vaisselle_laveuse_min": 600.00,
    "lave_vaisselle_laveuse_max": 1000.00,
    "chauffe_eau_installation_min": 750.00,
    "chauffe_eau_installation_max": 1400.00,
    "rough_in_par_appareil_min": 800.00,
    "rough_in_par_appareil_max": 1800.00,
    // === MAIN-D'ŒUVRE ===
    "taux_horaire_plombier_min": 110.00,
    "taux_horaire_plombier_max": 125.00,
    // === TUYAUTERIE ===
    "tuyauterie_installation_complexe_pi_min": 100.00,
    "tuyauterie_installation_complexe_pi_max": 250.00,
  },
  electricite: {
    // === COÛT PAR PI² (construction neuve complète) ===
    "installation_complete_pi2_min": 4.00,
    "installation_complete_pi2_max": 9.00,
    // === ESTIMATIONS PAR SUPERFICIE ===
    "maison_1000pi2_min": 4000.00,
    "maison_1000pi2_max": 9000.00,
    "maison_1500pi2_min": 6000.00,
    "maison_1500pi2_max": 13500.00,
    "maison_2000pi2_min": 8000.00,
    "maison_2000pi2_max": 18000.00,
    "maison_2500pi2_min": 10000.00,
    "maison_2500pi2_max": 22500.00,
    // === COMPOSANTES PRINCIPALES ===
    "panneau_100A": 1500.00,
    "panneau_200A": 2500.00,
    "panneau_400A": 4500.00,
    "circuit_standard_15A": 150.00,
    "circuit_20A": 200.00,
    "circuit_240V_30A": 350.00,
    "circuit_240V_50A": 500.00,
    "prise_standard": 25.00,
    "prise_GFCI": 45.00,
    "interrupteur_simple": 20.00,
    "interrupteur_3voies": 35.00,
    "interrupteur_dimmer": 50.00,
    // === EXTRAS SPÉCIALISÉS ===
    "borne_recharge_VE_niveau2": 1500.00,
    "borne_recharge_VE_niveau2_max": 3000.00,
    "domotique_base": 2000.00,
    "domotique_avance": 8000.00,
    "eclairage_encastre_unite": 75.00,
    "eclairage_encastre_installation": 50.00,
    // === MAIN-D'ŒUVRE ===
    "taux_horaire_electricien_min": 112.00,
    "taux_horaire_electricien_max": 185.00,
  },
  gypse_peinture: {
    // === GYPSE (pose + matériaux) ===
    "pose_gypse_pi2_min": 1.00,
    "pose_gypse_pi2_max": 3.00,
    // === TIRAGE DE JOINTS (finition plâtrier) ===
    "tirage_joints_niveau2_pi2": 0.80,
    "tirage_joints_niveau3_pi2": 1.20,
    "tirage_joints_niveau4_pi2": 1.60,
    "tirage_joints_niveau5_pi2": 2.00,
    // === TOTAL GYPSE + JOINTS (prêt à peindre) ===
    "gypse_joints_total_pi2_min": 1.80,
    "gypse_joints_total_pi2_max": 5.00,
    // === PEINTURE INTÉRIEURE ===
    "peinture_interieure_pi2_min": 2.00,
    "peinture_interieure_pi2_max": 6.00,
    // === TOTAL GYPSE + PEINTURE ===
    "gypse_peinture_total_pi2_min": 3.80,
    "gypse_peinture_total_pi2_max": 11.00,
    // === EXEMPLES PAR SUPERFICIE ===
    "gypse_1000pi2_pose": 2060.00,
    "gypse_1000pi2_joints_min": 670.00,
    "gypse_1000pi2_joints_max": 1288.00,
    "gypse_1000pi2_total_min": 2730.00,
    "gypse_1000pi2_total_max": 3348.00,
  },
  revetements_sol: {
    // === BOIS FRANC ET INGÉNIERIE ===
    "bois_ingenierie_pi2_min": 7.25,
    "bois_ingenierie_pi2_max": 13.25,
    "bois_massif_pi2_min": 9.00,
    "bois_massif_pi2_max": 18.00,
    // === VINYLE / LVP ===
    "vinyle_standard_pi2_min": 3.00,
    "vinyle_standard_pi2_max": 5.00,
    // === PLANCHER FLOTTANT / STRATIFIÉ ===
    "stratifie_flottant_pi2_min": 2.75,
    "stratifie_flottant_pi2_max": 5.25,
    // === CARRELAGE / CÉRAMIQUE ===
    "ceramique_porcelaine_pi2_min": 4.00,
    "ceramique_porcelaine_pi2_max": 20.00,
    "pierre_naturelle_pi2_min": 20.00,
    "pierre_naturelle_pi2_max": 50.00,
    // === MOQUETTE / TAPIS ===
    "moquette_pi2_min": 3.00,
    "moquette_pi2_max": 6.00,
    "moquette_installation_pi2": 1.00,
    // === BÉTON INTÉRIEUR ===
    "beton_poli_pi2_min": 3.75,
    "beton_poli_pi2_max": 15.00,
    "beton_estampe_pi2_min": 14.50,
    "beton_estampe_pi2_max": 29.00,
    // === ACCESSOIRES ===
    "accessoires_plinthes_transitions_pi2_min": 0.50,
    "accessoires_plinthes_transitions_pi2_max": 1.50,
  },
  finitions_interieures: {
    // === PORTES INTÉRIEURES ===
    "porte_interieure_unite_min": 300.00,
    "porte_interieure_unite_max": 800.00,
    "portes_maison_complete_min": 2500.00,
    "portes_maison_complete_max": 6000.00,
    "portes_pi2_habitable_min": 3.50,
    "portes_pi2_habitable_max": 7.00,
    // === MOULURES ET PLINTHES ===
    "plinthes_pied_lineaire_min": 6.00,
    "plinthes_pied_lineaire_max": 10.00,
    "moulures_plinthes_pi2_min": 1.50,
    "moulures_plinthes_pi2_max": 3.00,
    // === ESCALIERS ===
    "escalier_droit_min": 1500.00,
    "escalier_droit_max": 6000.00,
    "escalier_L_min": 2500.00,
    "escalier_L_max": 8000.00,
    "escalier_U_min": 3000.00,
    "escalier_U_max": 10000.00,
    "escalier_colimacon_min": 5000.00,
    "escalier_colimacon_max": 12000.00,
    "escalier_flottant_design_min": 8000.00,
    "escalier_flottant_design_max": 20000.00,
    "escalier_pi2_habitable_min": 3.00,
    "escalier_pi2_habitable_max": 6.00,
    // === TOTAL FINITIONS INTÉRIEURES ===
    "finitions_total_pi2_min": 8.00,
    "finitions_total_pi2_max": 16.00,
  },
  ebenisterie: {
    // === ARMOIRES CUISINE PAR PIED LINÉAIRE ===
    "armoires_cuisine_melamine_pl_min": 10.00,
    "armoires_cuisine_melamine_pl_max": 20.00,
    "armoires_cuisine_polymere_pl_min": 30.00,
    "armoires_cuisine_polymere_pl_max": 40.00,
    "armoires_cuisine_acrylique_laque_pl_min": 70.00,
    "armoires_cuisine_acrylique_laque_pl_max": 100.00,
    "armoires_cuisine_bois_massif_pl_min": 100.00,
    "armoires_cuisine_bois_massif_pl_max": 120.00,
    "armoires_cuisine_sur_mesure_pl_min": 300.00,
    "armoires_cuisine_sur_mesure_pl_max": 600.00,
    "armoires_cuisine_haut_gamme_pl_min": 800.00,
    "armoires_cuisine_haut_gamme_pl_max": 1200.00,
    "armoires_cuisine_luxe_pl_min": 1200.00,
    "armoires_cuisine_luxe_pl_max": 2000.00,
    // === MEUBLES SALLE DE BAIN PAR PIED LINÉAIRE ===
    "meubles_bain_entree_gamme_pl_min": 100.00,
    "meubles_bain_entree_gamme_pl_max": 180.00,
    "meubles_bain_milieu_gamme_pl_min": 180.00,
    "meubles_bain_milieu_gamme_pl_max": 350.00,
    "meubles_bain_haut_gamme_pl_min": 350.00,
    "meubles_bain_haut_gamme_pl_max": 800.00,
  },
  balcons: {
    // === FIBRE DE VERRE ===
    "balcon_fibre_verre_pi2_min": 30.00,
    "balcon_fibre_verre_pi2_max": 45.00,
    // === BOIS TRAITÉ / STANDARD ===
    "balcon_bois_traite_pi2_min": 48.00,
    "balcon_bois_traite_pi2_max": 60.00,
    // === CÈDRE / BOIS TORRÉFIÉ ===
    "balcon_cedre_torrefix_pi2_min": 60.00,
    "balcon_cedre_torrefix_pi2_max": 72.00,
    // === COMPOSITE ===
    "balcon_composite_pi2_min": 50.00,
    "balcon_composite_pi2_max": 60.00,
    // === BÉTON ===
    "balcon_beton_pi2_min": 70.00,
    "balcon_beton_pi2_max": 85.00,
  },
  taux_CCQ_2025: {
    charpentier_menuisier: 48.50,
    electricien: 52.00,
    plombier: 54.00,
    frigoriste: 56.00,
    ferblantier: 50.00,
    briqueteur_macon: 49.00,
    platrier: 46.00,
    peintre: 42.00,
    operateur_pelle: 55.00,
    vitrier_installateur: 45.00,
    poseur_plancher: 44.00,
    carreleur: 47.00,
    menuisier_finition: 46.00,
    ebeniste: 50.00,
  }
};

const SYSTEM_PROMPT_EXTRACTION = `Tu es un ESTIMATEUR PROFESSIONNEL QUÉBÉCOIS CERTIFIÉ avec 25 ans d'expérience en AUTOCONSTRUCTION.

MISSION: Analyser TOUS les plans de construction fournis simultanément pour produire une estimation COMPLÈTE pour un projet d'AUTOCONSTRUCTION (owner-builder, sans entrepreneur général).

## ⚠️ LECTURE CRITIQUE DES PLANS - TRÈS IMPORTANT

Tu DOIS lire ATTENTIVEMENT:
1. **TOUTES LES NOTES ÉCRITES** sur chaque plan - annotations, dimensions, spécifications techniques, légendes
2. **Les tableaux de fenêtres/portes** avec dimensions exactes, types et quantités
3. **Les coupes et élévations** pour comprendre les hauteurs et détails de construction
4. **Les notes de construction** indiquant les matériaux, épaisseurs, types d'isolation
5. **Les cotes et dimensions** pour calculer les périmètres et superficies EXACTES
6. **Les indications "nouveau"/"existant"** ou lignes pointillées montrant ce qui est à construire vs. ce qui existe déjà

NE TE FIE PAS SEULEMENT À L'IMAGE - LIS CHAQUE MOT, CHAQUE NOTE, CHAQUE DIMENSION INSCRITE SUR LES PLANS.

## CONTEXTE AUTOCONSTRUCTION

Cette estimation est pour un autoconstructeur qui:
- Gère lui-même son projet (pas de frais de gestion d'entrepreneur 10-15%)
- Coordonne directement les sous-traitants
- Peut réaliser certaines tâches lui-même (finitions, peinture, etc.)
- Économise les marges de profit d'un entrepreneur général

## CALCULS BASÉS SUR LE PÉRIMÈTRE (PIED LINÉAIRE)

Pour les fondations et structures, calcule en utilisant le PÉRIMÈTRE du projet:
- **Semelles**: Périmètre x profondeur x prix/pi linéaire (10$-15$/pi lin)
- **Murs de fondation**: Périmètre x hauteur x épaisseur = volume béton
- **Structure murale**: Périmètre x hauteur = superficie murs extérieurs

Formule clé: Périmètre (pi lin) = 2 x (longueur + largeur) du bâtiment

## EXTRACTION REQUISE - TOUTES LES CATÉGORIES

Tu DOIS produire des estimations pour CHAQUE catégorie suivante, même si les plans ne montrent pas tous les détails:

1. **Excavation** - Creusage selon PÉRIMÈTRE + profondeur, nivellement, disposition terre
2. **Fondation** - Semelles (périmètre x prix/pi lin), murs (périmètre x hauteur), dalle
3. **Structure** - Charpente basée sur périmètre des murs + solives pour superficie
4. **Toiture** - Fermes de toit, couverture, bardeaux, soffites, fascias
5. **Revêtement extérieur** - Parement calculé selon périmètre x hauteur des murs
6. **Fenêtres et portes** - DÉTAILLER chaque élément avec:
   - Dimensions exactes (largeur x hauteur en pouces)
   - Type de cadre: PVC, Hybride (alu/PVC), Aluminium
   - Type d'ouverture: Coulissante, Battant, Auvent, Fixe
   - Couleur ext/int (ex: Noir/Blanc, Blanc/Blanc)
   - Vitrage: Double/Triple, Low-E, Argon/Krypton
   - Options: Carrelage, séparateurs, certifications EnergyStar
   - Portes: Type, matériau, insertions verre, quincaillerie
7. **Isolation et pare-air** - Isolation murs (périmètre x hauteur), plafonds, pare-vapeur
8. **Électricité** - Panneau, filage, prises, interrupteurs, luminaires
9. **Plomberie** - Tuyauterie, drains, robinetterie, chauffe-eau
10. **Chauffage/CVAC** - Système de chauffage, ventilation, climatisation
11. **Finition intérieure** - Gypse, peinture, moulures, planchers
12. **Cuisine** - Armoires, comptoirs, électroménagers
13. **Salle(s) de bain** - Vanités, toilettes, douches/bains

## RÈGLES CRITIQUES

- Analyse TOUTES les pages/images fournies ENSEMBLE
- **LIS TOUTES LES NOTES ET ANNOTATIONS** sur chaque plan - elles contiennent des informations cruciales
- Calcule le PÉRIMÈTRE en pieds linéaires pour fondations, structure et murs
- Pour les éléments non visibles sur les plans, ESTIME en fonction de la superficie et du type de projet
- Utilise les prix du marché Québec 2025 pour AUTOCONSTRUCTION
- Ratio main-d'œuvre/matériaux: 35-50% selon le type de travail
- TOUJOURS inclure TPS 5% + TVQ 9.975%
- TOUJOURS ajouter contingence 5%
- Les coûts sont calculés PAR ÉTAGE (superficie habitable par niveau)

## COÛT TOTAL AUTOCONSTRUCTION AU QUÉBEC 2025 (référence globale par pi² habitable)

⚠️ IMPORTANT: Ces coûts sont pour l'AUTOCONSTRUCTION (sans frais de gestion entrepreneur 10-15%)

| Gamme | Coût global $/pi² | Description |
|-------|-------------------|-------------|
| Entrée de gamme | 160$ - 190$/pi² | Finis simples, matériaux économiques |
| Gamme intermédiaire | 190$ - 240$/pi² | Bon rapport qualité-prix, finis standards |
| Haut de gamme | 300$/pi²+ | Finis luxueux, personnalisation élevée |

**Estimation typique AUTOCONSTRUCTION Québec 2025**: 180$ à 240$/pi² pour une maison standard
**Fourchette large observée**: 180$ à 330$/pi² selon les matériaux et la complexité

## CE QUI EST INCLUS DANS CES COÛTS

✅ INCLUS:
- Structure de la maison (fondations, murs, toiture)
- Matériaux de construction
- Main-d'œuvre des sous-traitants (électricien, plombier, etc.)
- Finitions intérieures standards
- Contingence 5%
- Taxes TPS/TVQ

❌ NON INCLUS (à ajouter séparément si applicable):
- Achat du terrain
- Raccordements aux services publics (eau, égouts, électricité)
- Aménagement paysager
- Permis et inspections

## COÛTS D'EXCAVATION QUÉBEC 2025 (référence détaillée)

| Type d'excavation | Coût par m³ | Notes |
|-------------------|-------------|-------|
| Sol mou/argileux | 125$ - 175$ | Moins cher à excaver |
| Standard (agrandissement) | 175$ - 225$ | Moyenne 200$/m³ |
| Sol rocailleux | 300$ - 500$ | Équipement spécialisé requis |
| Disposition terre excavée | 25$ - 75$/m³ | Transport inclus |
| Gestion eaux souterraines | 50$ - 100$/m³ | Si nappe phréatique |

**Tarifs horaires excavation**:
- Pelle mécanique standard: 160$/heure
- Équipement avec marteau piqueur: 250$/heure+

**Coûts supplémentaires**:
- Dynamitage si présence de roc: 5 000$ à 10 000$ forfaitaire
- Majoration travaux d'hiver: +30% à +50% (gel du sol)

**Calcul typique**: Pour une fondation standard de 8' de profondeur:
- Volume = Superficie x 0.75m (profondeur moyenne creusée)
- Coût excavation = Volume m³ x 200$/m³ (ajuster selon type de sol)

## COÛTS DE BÉTON QUÉBEC 2025 (référence détaillée)

### PRIX DU BÉTON PAR M³

| Type de béton | Sans Air | Avec Air Entrainé |
|---------------|----------|-------------------|
| 20 MPA | 226$ | 233$ |
| 25 MPA | 236$ | 243$ |
| 30 MPA | 246$ | 253$ |
| 32 MPA | 256$ | 263$ |
| 35 MPA | 266$ | 273$ |
| Mélange Piscine | 246$ | - |
| Béton Remblai | 202$ | - |

**Air entrainé**: +7$/m³ (recommandé pour dalles extérieures et climat québécois)

### MISE EN PLACE ET FINITION (par pi²)

| Type de finition | Prix au pi² | Minimum |
|------------------|-------------|---------|
| Finition à la truelle | 2,50$ | 1 500$ |
| Finition à l'hélicoptère | 3,25$ | 1 700$ |
| Finition estampage (couleurs incluses) | 5,00$ | 2 500$ |

**Scellant Mac**: 305$/5 gallons (non inclus dans estampage)

### MANUTENTION ET POMPAGE

| Service | Prix |
|---------|------|
| Manutention 4m et moins | 460$ forfait |
| Location pompe (4h minimum) | 710$ |
| Pompe heure supplémentaire | 150$/heure |
| Sac de lavage | 110$ |
| Lavage à l'usine (extra) | 110$ |

### TEMPS ALLOUÉ PAR VOLUME

| Volume | Temps alloué |
|--------|--------------|
| Moins de 1m³ | 30 minutes |
| 1 à 2m³ | 35 minutes |
| 2 à 3m³ | 40 minutes |
| 3 à 4m³ | 45 minutes |
| 4 à 5m³ | 50 minutes |
| 5 à 6m³ | 55 minutes |
| 6m³ et + | 60 minutes |

**Temps supplémentaire**: 3$/minute | **Taux horaire camion**: 190$/heure

### ADDITIFS ET PRODUITS

| Produit | Prix par m³ |
|---------|-------------|
| Fibre | 44,50$ |
| Calcium (accélérateur) | 40$ |
| Retardant | 40$ |
| Couleur pâle intégrale | 110$ |
| Couleur foncée intégrale | 160$ |

### FRAIS DE LIVRAISON PAR ZONE

**Zone Laval**:
- St-François, St-Vincent Paul: 250$ ou min. 750$
- Vimont, BDF, Auteuil: 260$ ou min. 760$
- Fabreville, Chomedy, Ste-Rose: 275$ ou min. 775$
- Laval-Ouest, Ste-Dorothée: 300$ ou min. 785$

**Zone Montréal**:
- Montréal-Est, PAT, Anjou: 250$ ou min. 750$
- St-Léonard, MTL-Nord, Ahuntsic: 275$ ou min. 775$
- Plateau, Ville St-Laurent: 275$ ou min. 775$
- Pointe-Claire, Dorval, DDO: 350$ ou min. 850$
- Rive-Sud (Longueuil, Boucherville): 360$ ou min. 860$

**Zone Lanaudière/Rive-Nord**:
- L'Assomption, Repentigny (20km et moins): 220$ ou min. 610$
- St-Jacques, Mascouche, Terrebonne: 250$ ou min. 675$
- Saint-Lin, La Plaine, Joliette: 265$ ou min. 695$
- Boisbriand, Rosemère, Berthier: 285$ ou min. 735$
- Blainville, Mirabel, St-Eustache: 310$ ou min. 785$
- St-Jérôme, Ste-Béatrix, Chertsey: 335$ ou min. 835$

**Extra livraison samedi**: 150$/camion

### CALCUL TYPIQUE COULÉE DE DALLE

1. Calculer volume: Superficie (pi²) x Épaisseur (po) / 324 = m³
2. Choisir résistance: 25 MPA pour dalles intérieures, 32 MPA avec air pour extérieur
3. Ajouter frais livraison selon zone
4. Ajouter finition: Superficie x prix/pi² selon type
5. Si pompe requise (>4m du camion): ajouter location pompe

**Exemple**: Dalle 1000 pi² x 4" en zone Laval
- Volume: 1000 x 4 / 324 = 12.35 m³ → arrondir à 13 m³
- Béton 30 MPA: 13 x 253$ = 3 289$
- Livraison Laval: 275$
- Finition hélicoptère: 1000 x 3.25$ = 3 250$
- Pompe (si requise): 710$
- **Total estimé: 7 524$** (avant taxes)

## COÛTS DE FONDATION QUÉBEC 2025 (référence détaillée)

| Type de fondation | Coût par pi² | Notes |
|-------------------|--------------|-------|
| Dalle sur sol | 6,50$ - 11$ | Option la plus économique |
| Blocs de béton | 10$ - 15$ | Construction traditionnelle |
| Vide sanitaire | 12$ - 18$ | Accès aux services mécaniques |
| Béton coulé standard | 14$ - 20$ | Le plus courant au Québec |
| Coffrage et béton coulé | 14,42$ - 20,60$ | Précision détaillée |
| Sous-sol complet | 18$ - 25$ | Espace habitable additionnel |

**Semelles de fondation**: 10$ à 15$ par pied linéaire
- Inclut: excavation locale, béton coulé et armature en acier

**Calcul typique pour fondation béton coulé**:
- Coût = Périmètre (pi linéaires) x Hauteur mur (pi) x 17$/pi² (moyenne)
- OU = Superficie fondation (pi²) x 17$/pi² (méthode simplifiée)

## COÛTS D'ISOLATION QUÉBEC 2025 (référence détaillée)

| Type d'isolant | Valeur R | Prix au pi² |
|----------------|----------|-------------|
| Laine minérale | R20 | 1,00$ |
| Cellulose soufflée | R40 | 0,85$ - 0,90$ |
| Cellulose soufflée | R50 | 0,95$ - 1,00$ |
| Cellulose soufflée | R60 | 1,00$ - 1,50$ |
| Uréthane giclé | 1 pouce | 3,00$ - 4,00$ |
| Uréthane giclé | 2 pouces | 4,00$ - 5,00$ |
| Uréthane giclé | 3 pouces | 5,00$ - 7,00$ |
| Coffrage isolant (ICF) | R22-R32 | 140$ - 230$/pi² |

**Notes isolation**:
- Cellulose soufflée: excellent rapport qualité-prix pour greniers
- Uréthane giclé: meilleure étanchéité à l'air, idéal sous-sols et vides sanitaires
- Coffrage isolant (ICF): coût inclut le mur complet (structure + isolation)

**Calcul typique isolation murs**:
- Murs extérieurs: Superficie murs x prix/pi² selon type d'isolant
- Grenier: Superficie plafond x prix/pi² cellulose R60

## COÛTS DE TOITURE QUÉBEC 2025 (référence détaillée)

| Type de revêtement | Prix au pi² (installation incluse) | Durée de vie | Application |
|--------------------|-----------------------------------|--------------|-------------|
| Bardeau d'asphalte | 3$ - 12$ | 15-30 ans | Toits en pente |
| Tôle/Métal | 10$ - 30$ | 50+ ans | Toits en pente |
| Membrane élastomère | 11$ - 25$ | 25-35 ans | Toits plats |
| Membrane TPO | 11$ - 22$ | 20-30 ans | Toits plats |
| Membrane EPDM | 11$ - 25$ | 20-25 ans | Toits plats |

**Facteurs influençant les coûts**:
- Pente du toit: Plus la pente est élevée, plus la surface est grande et le travail complexe
- Complexité: Nombre de versants, noues, cheminées, puits de lumière
- Retrait ancien revêtement: 2$ à 5$/pi² supplémentaire
- Travaux hivernaux: Majoration possible

**Calcul typique toiture**:
- Surface toiture ≈ Superficie au sol x 1.15 (pente standard) à x 1.4 (forte pente)
- Coût = Surface toiture x prix/pi² selon type de revêtement

## COÛTS FENÊTRES ET PORTES QUÉBEC 2025 (référence détaillée)

### FENÊTRES - Prix par pi² selon type et dimensions

| Type de fenêtre | Petite (<15pi²) | Moyenne (15-25pi²) | Grande (>25pi²) |
|-----------------|-----------------|--------------------|-----------------| 
| PVC Coulissante (blanc) | 25$/pi² | 22$/pi² | 20$/pi² |
| PVC Battant (blanc) | 35$/pi² | 30$/pi² | 28$/pi² |
| Hybride Battant (alu/PVC) | 55$/pi² | 50$/pi² | 45$/pi² |
| Hybride Auvent | 60$/pi² | 55$/pi² | 50$/pi² |
| Aluminium Fixe | 40$/pi² | 38$/pi² | 35$/pi² |

### OPTIONS DE VITRAGE

| Type de vitrage | Coût additionnel |
|-----------------|------------------|
| Double Low-E Argon | Inclus (standard) |
| Triple Low-E Argon | +25% du prix fenêtre |
| Triple Low-E Krypton | +40% du prix fenêtre |

### OPTIONS COULEUR (majoration par fenêtre)

| Couleur Ext/Int | Majoration |
|-----------------|------------|
| Blanc/Blanc | Inclus |
| Noir/Blanc | +150$/fenêtre |
| Bronze/Blanc | +175$/fenêtre |
| Couleur custom | +250$/fenêtre |

### CARRELAGE ET GRILLES DÉCORATIVES

| Type | Prix par fenêtre |
|------|------------------|
| Carrelage colonial | +75$ |
| Carrelage rectangulaire | +100$ |
| Séparateur intégré (1") | +125$ |

### PORTES EXTÉRIEURES

| Type de porte | Prix unitaire |
|---------------|---------------|
| Simple acier isolée | 800$ - 1200$ |
| Simple fibre de verre | 1200$ - 1800$ |
| Simple bois massif | 2500$ - 4000$ |
| Double (porte-fenêtre) acier | 1800$ - 2500$ |
| Double fibre de verre | 2800$ - 4000$ |
| Patio coulissante 6' | 1500$ - 2200$ |
| Patio coulissante 8' | 2200$ - 3200$ |
| Patio française | 3500$ - 5000$ |
| Garage simple 9x7 | 1200$ - 1800$ |
| Garage double 16x7 | 2000$ - 3000$ |

### OPTIONS PORTES

| Option | Prix |
|--------|------|
| Insertion verre demi-vitrée | +350$ |
| Insertion verre pleine vitre | +600$ |
| Cadrage aluminium contemporain | +200$ |
| Quincaillerie nickel satiné | +100$ |
| Quincaillerie noir mat | +125$ |

### PORTES INTÉRIEURES

| Type | Prix par porte (avec cadrage) |
|------|-------------------------------|
| Creuse standard | 150$ - 225$ |
| Âme pleine | 250$ - 350$ |
| MDF avec moulures | 300$ - 450$ |
| Française vitrée | 450$ - 700$ |
| Coulissante grange | 600$ - 1000$ |

### INSTALLATION (main-d'œuvre)

| Élément | Coût installation |
|---------|-------------------|
| Fenêtre standard | 150$/unité |
| Grande fenêtre/baie | 250$/unité |
| Porte extérieure | 300$/unité |
| Porte intérieure | 100$/unité |

### CALCUL DÉTAILLÉ FENÊTRES ET PORTES

Pour chaque fenêtre identifiée sur les plans:
1. Calculer la superficie: Largeur (po) x Hauteur (po) / 144 = pi²
2. Identifier le type: PVC, Hybride, Aluminium
3. Identifier l'ouverture: Coulissante, Battant, Auvent, Fixe
4. Appliquer le prix/pi² correspondant
5. Ajouter majorations: couleur, vitrage, carrelage
6. Ajouter coût installation

**Exemple**: Fenêtre hybride battant 60"x36" noir/blanc avec carrelage
- Superficie: 60 x 36 / 144 = 15 pi²
- Prix base: 15 pi² x 50$/pi² = 750$
- Majoration noir/blanc: +150$
- Carrelage: +100$
- Installation: +150$
- **Total: 1150$**

## COÛTS DE PLOMBERIE QUÉBEC 2025 (référence détaillée)

### COÛTS GLOBAUX CONSTRUCTION NEUVE

| Poste | Coût estimé |
|-------|-------------|
| Rough-in plomberie (maison 1000-2000 pi²) | 5 000$ - 6 000$ |
| Finition de plomberie (connexion appareils) | 5 500$+ |
| **Total plomberie maison neuve** | **10 000$ - 15 000$+** |

*Le rough-in comprend l'installation des tuyaux d'alimentation et de drainage AVANT les appareils.*
*La finition comprend la connexion des appareils (lavabo, toilette, douche, etc.).*

### ESTIMATION PAR APPAREIL (main-d'œuvre + tuyauterie)

| Appareil / Travaux | Coût estimé (2025-26) |
|--------------------|-----------------------|
| Toilette (WC) | 800$ - 1 300$ |
| Lavabo / Évier salle de bain | 800$ - 1 300$ |
| Douche / Bain (plomberie de base) | 1 200$ - 2 000$ |
| Lave-vaisselle / Laveuse (raccordement) | 600$ - 1 000$ |
| Chauffe-eau (installation complète) | 750$ - 1 400$ |
| Rough-in par point d'eau (avant pose) | 800$ - 1 800$ |

### MAIN-D'ŒUVRE PLOMBERIE

| Tarif | Prix (région Montréal) |
|-------|------------------------|
| Taux horaire plombier résidentiel | 110$ - 125$/heure |
| Taux CCQ officiel 2025 | 54$/heure (base) |

*Les plombiers résidentiels facturent souvent entre 110$ et 125$/h (référence RBQ/CMMTQ).*

### TUYAUTERIE ET MATÉRIAUX

| Type d'installation | Coût par pied linéaire |
|---------------------|------------------------|
| Installation simple (PEX) | 50$ - 100$ |
| Installation complexe (cuivre/murs) | 100$ - 250$+ |

### CALCUL TYPIQUE PLOMBERIE MAISON NEUVE

**Exemple: Maison 2 chambres, 1 salle de bain complète + 1 salle d'eau**

1. **Salle de bain complète**: toilette + lavabo + douche/bain
   - Rough-in 3 appareils: 3 x 1 000$ = 3 000$
   - Finition: 3 000$
   
2. **Salle d'eau**: toilette + lavabo
   - Rough-in 2 appareils: 2 x 1 000$ = 2 000$
   - Finition: 2 000$
   
3. **Cuisine**: évier + lave-vaisselle
   - Rough-in 2 appareils: 2 x 900$ = 1 800$
   - Finition: 1 500$
   
4. **Buanderie**: laveuse
   - Rough-in: 800$
   - Finition: 600$
   
5. **Chauffe-eau**: 1 000$

**Total estimé: ~12 700$** (avant taxes)

### FACTEURS INFLUENÇANT LES COÛTS

- **Nombre de salles de bain**: Chaque SDB complète ajoute 4 000$ - 6 000$
- **Configuration**: Appareils empilés (2 étages) = économies sur la tuyauterie
- **Type de tuyauterie**: PEX (économique) vs Cuivre (premium)
- **Accès**: Sous-sol vs dalle sur sol (plus complexe)
- **Appareils haut de gamme**: Peuvent augmenter les coûts de 20-50%

## COÛTS D'ÉLECTRICITÉ QUÉBEC 2025 (référence détaillée)

### COÛT PAR PIED CARRÉ (construction neuve complète)

| Élément | Coût estimé |
|---------|-------------|
| Installation électrique complète | **4$ à 9$ / pi² habitable** |

*Ce coût comprend: câblage, panneau, prises, interrupteurs, luminaires de base, main-d'œuvre et matériaux.*

### ESTIMATION PAR SUPERFICIE

| Superficie habitable | Estimation électrique totale |
|---------------------|------------------------------|
| 1 000 pi² | 4 000$ à 9 000$ |
| 1 500 pi² | 6 000$ à 13 500$ |
| 2 000 pi² | 8 000$ à 18 000$ |
| 2 500 pi² | 10 000$ à 22 500$ |

*Ces montants incluent l'installation électrique complète mais PAS les extras spécialisés.*

### CE QUI EST INCLUS

✅ Installation des circuits, prises et interrupteurs
✅ Mise en place du panneau électrique principal
✅ Fourniture des fils, gaines, connecteurs et protections
✅ Luminaires de base
✅ Tests et conformité au Code de construction

### COMPOSANTES ET CIRCUITS

| Composante | Coût unitaire |
|------------|---------------|
| Panneau 100A | 1 500$ |
| Panneau 200A | 2 500$ |
| Panneau 400A | 4 500$ |
| Circuit standard 15A | 150$ |
| Circuit 20A | 200$ |
| Circuit 240V 30A (sécheuse, cuisinière) | 350$ |
| Circuit 240V 50A (spa, borne VE) | 500$ |

### PRISES ET INTERRUPTEURS

| Élément | Coût (matériel + installation) |
|---------|-------------------------------|
| Prise standard | 25$ |
| Prise GFCI (salle de bain, cuisine) | 45$ |
| Interrupteur simple | 20$ |
| Interrupteur 3 voies | 35$ |
| Interrupteur dimmer | 50$ |

### EXTRAS SPÉCIALISÉS (non inclus dans coût de base)

| Extra | Coût additionnel |
|-------|------------------|
| Borne de recharge VE niveau 2 | 1 500$ - 3 000$ |
| Système domotique de base | 2 000$ |
| Système domotique avancé | 8 000$+ |
| Éclairage encastré (par unité) | 75$ + 50$ installation |
| Circuit spa extérieur | 800$ - 1 200$ |
| Panneau solaire (préparation) | 500$ - 1 000$ |

### MAIN-D'ŒUVRE ÉLECTRICIEN

| Tarif | Prix (Québec 2025) |
|-------|-------------------|
| Taux horaire résidentiel léger | 112$/heure |
| Taux horaire résidentiel lourd/complexe | 185$/heure |
| Taux CCQ officiel 2025 (base) | 52$/heure |

### CALCUL TYPIQUE ÉLECTRICITÉ MAISON NEUVE

**Exemple: Maison 1 500 pi² standard**

1. **Installation de base** (6.50$/pi²)
   - 1 500 pi² x 6.50$ = 9 750$
   
2. **Extras optionnels**:
   - Borne de recharge VE: +2 000$
   - 10 encastrés additionnels: 10 x 125$ = +1 250$
   - Interrupteurs dimmer (5): 5 x 50$ = +250$

**Total avec extras: ~13 250$** (avant taxes)

### FACTEURS INFLUENÇANT LES COÛTS

- **Complexité du plan électrique**: Domotique, circuits spéciaux, éclairage architectural
- **Nombre de circuits spéciaux**: Spa, atelier, garage chauffé
- **Calibre des fils et disjoncteurs**: Standard vs haute capacité
- **Accessibilité**: Sous-sol ouvert vs construction sur dalle
- **Permis et inspections**: Obligatoires au Québec (inclus dans estimation)

## COÛTS DE GYPSE ET PEINTURE QUÉBEC 2025 (référence détaillée)

### TRAVAUX DE GYPSE (pose et finition)

| Poste | Coût au pi² |
|-------|-------------|
| Pose de gypse (matériaux + installation) | 1$ à 3$ |
| Tirage de joints niveau 2 (basique) | 0,80$ |
| Tirage de joints niveau 3 (standard) | 1,20$ |
| Tirage de joints niveau 4 (bon) | 1,60$ |
| Tirage de joints niveau 5 (premium) | 2,00$ |
| **Total gypse + joints (prêt à peindre)** | **1,80$ à 5$** |

*Inclut murs + plafonds finis au niveau basique à bon.*

### NIVEAUX DE FINITION DES JOINTS

- **Niveau 2**: Joints visibles, acceptable pour garage/sous-sol non fini
- **Niveau 3**: Texture légère, acceptable pour surfaces texturées
- **Niveau 4**: Finition standard résidentielle (recommandé)
- **Niveau 5**: Finition premium pour surfaces lisses et éclairage rasant

### PEINTURE INTÉRIEURE

| Poste | Coût au pi² |
|-------|-------------|
| Peinture intérieure professionnelle | 2$ à 6$ |

*Inclut murs + plafonds. Le prix varie selon qualité de peinture, préparation des surfaces et nombre de couches.*

### TOTAL COMBINÉ GYPSE + PEINTURE

| Poste de travaux | Coût approximatif / pi² habitable |
|------------------|-----------------------------------|
| Pose gypse + joints (prêt à peindre) | 1,80$ à 5$ |
| Peinture intérieure | 2$ à 6$ |
| **TOTAL gypse + peinture** | **3,80$ à 11$ / pi²** |

*Ce montant couvre murs + plafonds intérieurs pour une maison résidentielle neuve au Québec.*

### EXEMPLES PAR SUPERFICIE

| Superficie | Gypse + joints | Peinture | Total estimé |
|------------|----------------|----------|--------------|
| 1 000 pi² | 2 730$ - 3 348$ | 2 000$ - 6 000$ | 4 730$ - 9 348$ |
| 1 500 pi² | 4 095$ - 5 022$ | 3 000$ - 9 000$ | 7 095$ - 14 022$ |
| 2 000 pi² | 5 460$ - 6 696$ | 4 000$ - 12 000$ | 9 460$ - 18 696$ |

### FACTEURS INFLUENÇANT LES COÛTS

**Gypse**:
- Type de panneaux (standard, résistant à l'humidité, anti-feu)
- Hauteur des plafonds (>9' = majoration)
- Complexité des angles et détails architecturaux
- Accessibilité du chantier

**Peinture**:
- Préparation des murs (sablage, réparation) si nécessaire
- Hauteur des plafonds
- Inclusion ou non des portes/moulures/escaliers
- Qualité et marque des peintures choisies
- Nombre de couleurs différentes

### MAIN-D'ŒUVRE

| Métier | Taux CCQ 2025 |
|--------|---------------|
| Plâtrier | 46$/heure |
| Peintre | 42$/heure |

## COÛTS REVÊTEMENTS DE SOL QUÉBEC 2025 (référence détaillée)

### TYPES DE REVÊTEMENTS (matériaux + installation)

| Type de revêtement | Coût au pi² installé |
|--------------------|---------------------|
| **Plancher flottant / stratifié** | 2,75$ à 5,25$ |
| **Vinyle standard (LVP)** | 3$ à 5$ |
| **Moquette résidentielle** | 3$ à 6$ + 1$ pose |
| **Carrelage céramique / porcelaine** | 4$ à 20$+ |
| **Bois d'ingénierie** | 7,25$ à 13,25$ |
| **Bois massif (hardwood)** | 9$ à 18$ |
| **Béton poli** | 3,75$ à 15$ |
| **Béton estampé** | 14,50$ à 29$ |
| **Pierre naturelle** | 20$ à 50$+ |

### DÉTAILS PAR TYPE

**🪵 Bois franc / Bois d'ingénierie**
- Bois d'ingénierie (engineered) : 7,25$ à 13,25$/pi²
- Bois massif : 9$ à 18$/pi²
- Charme élevé, idéal pour salons et chambres

**💠 Vinyle (PVC / LVP)**
- Standard : 3$ à 5$/pi²
- Résistant à l'eau, facile d'entretien
- Populaire pour cuisines et salons

**🪵 Plancher flottant / Stratifié (laminé)**
- Budget : 2,75$ à 5,25$/pi²
- Option économique imitant bois ou pierre

**🧱 Carrelage / Céramique**
- Céramique / porcelaine : 4$ à 20$/pi²
- Pierre naturelle : 20$ à 50$+/pi²
- Idéal salles de bain, entrées, cuisines

**🪶 Moquette (tapis)**
- Matériaux : 3$ à 6$/pi²
- Installation : 0,60$ à 1,50$/pi²
- Confortable, isolante, idéale pour chambres

**🧱 Béton intérieur**
- Béton poli : 3,75$ à 15$/pi²
- Béton estampé : 14,50$ à 29$/pi²
- Moderne et durable, sous-sol ou rez-de-chaussée

### ACCESSOIRES ET PRÉPARATION

| Poste | Coût additionnel |
|-------|-----------------|
| Plinthes, transitions, sous-couche | 0,50$ à 1,50$/pi² |
| Préparation sous-plancher (nivellement) | Variable |
| Isolation, pare-vapeur | Selon besoins |

### EXEMPLES PAR SUPERFICIE

| Superficie | Vinyle (éco) | Bois ingénierie (standard) | Céramique (moyen) |
|------------|--------------|----------------------------|-------------------|
| 1 000 pi² | 3 000$ - 5 000$ | 7 250$ - 13 250$ | 8 000$ - 15 000$ |
| 1 500 pi² | 4 500$ - 7 500$ | 10 875$ - 19 875$ | 12 000$ - 22 500$ |
| 2 000 pi² | 6 000$ - 10 000$ | 14 500$ - 26 500$ | 16 000$ - 30 000$ |

### FACTEURS INFLUENÇANT LES COÛTS DES PLANCHERS

- **Surface à couvrir** : Inclure halls, escaliers, placards
- **Préparation** : Nivellement, isolation, pare-vapeur
- **Complexité** : Découpes, motifs, transitions entre pièces
- **Accessibilité** : Étage, sous-sol, escaliers
- **Qualité des matériaux** : Budget vs haut de gamme

### MAIN-D'ŒUVRE PLANCHERS

| Métier | Taux CCQ 2025 |
|--------|---------------|
| Poseur de plancher | 44$/heure |
| Carreleur | 47$/heure |

## COÛTS FINITIONS INTÉRIEURES QUÉBEC 2025 (référence détaillée)

### 1. PORTES INTÉRIEURES (achat + installation)

| Poste | Coût |
|-------|------|
| Porte intérieure standard (battante, bloc pré-monté) | 300$ à 800$ par porte installée |
| Maison complète (10-12 portes) | 2 500$ à 6 000$+ total |
| **Par pi² habitable** | **3,50$ à 7$+** |

*Inclut porte, cadre, quincaillerie et pose professionnelle.*

### 2. MOULURES ET PLINTHES (trim & baseboards)

| Poste | Coût |
|-------|------|
| Plinthes (matériaux + pose) | 6$ à 10$ par pied linéaire |
| **Par pi² habitable** | **1,50$ à 3$** |

*Varie selon style (MDF, PVC, bois dur) et finition.*

**Exemple** : Maison 2 000 pi² = 300-400 pi linéaires de plinthes = 2 500$ à 4 000$ total

### 3. ESCALIER INTÉRIEUR (structure + finition)

| Type d'escalier | Coût installation incluse |
|-----------------|---------------------------|
| Escalier droit | 1 500$ à 6 000$ |
| Escalier en L | 2 500$ à 8 000$ |
| Escalier en U | 3 000$ à 10 000$ |
| Escalier colimaçon | 5 000$ à 12 000$ |
| Flottant / design haut de gamme | 8 000$ à 20 000$+ |

*Inclut structure, marches, limons, rampes et main-courante.*

| Répartition par pi² | Coût |
|---------------------|------|
| Escalier standard (6 000$) / 2 000 pi² | ≈ 3$/pi² |
| Escalier haut de gamme (12 000$) / 2 000 pi² | ≈ 6$/pi² |

### RÉSUMÉ FINITIONS INTÉRIEURES PAR PI² HABITABLE

| Élément | Estimation moyenne |
|---------|-------------------|
| Portes intérieures | 3,50$ à 7$+ / pi² |
| Moulures & plinthes | 1,50$ à 3$ / pi² |
| Escalier (réparti) | 3$ à 6$ / pi² |
| **TOTAL finitions intérieures** | **8$ à 16$ / pi²** |

### CE QUI EST INCLUS

✔ Portes intérieures standards avec cadres et quincaillerie
✔ Moulures de base et plinthes (installation professionnelle)
✔ Escalier complet standard (structure + finition)

### CE QUI N'EST PAS INCLUS

- Portes et moulures haut de gamme personnalisées
- Rampes complexes en verre/métal
- Travaux structurels ou modifications de cloisons
- Peinture de finition (budgetée séparément)

### MAIN-D'ŒUVRE FINITIONS

| Métier | Taux CCQ 2025 |
|--------|---------------|
| Menuisier finition | 46$/heure |
| Charpentier-menuisier | 48,50$/heure |

## COÛTS ÉBÉNISTERIE QUÉBEC 2025 (référence détaillée)

### ARMOIRES DE CUISINE PAR PIED LINÉAIRE (installées)

| Niveau & Matériau | Coût par pied linéaire |
|-------------------|------------------------|
| Entrée de gamme / mélamine stratifiée | 10$ à 20$ |
| Polymère / polyester (moyen) | 30$ à 40$ |
| Acrylique / laque (milieu de gamme) | 70$ à 100$ |
| Bois massif / bois fini (haut de gamme) | 100$ à 120$+ |
| Sur mesure standard (qualité courante) | **300$ à 600$** |
| Haut de gamme / luxe | 800$ à 1 200$+ |
| Custom très haut de gamme | 1 200$ à 2 000$+ |

*Pour une cuisine typique moyenne au Québec : ≈ **300$ à 600$ / pied linéaire** installé.*

### MEUBLES DE SALLE DE BAIN PAR PIED LINÉAIRE

| Type de meuble | Coût par pied linéaire |
|----------------|------------------------|
| Entrée de gamme | 100$ à 180$ |
| Milieu de gamme | 180$ à 350$ |
| Haut de gamme / sur mesure | 350$ à 800$+ |

*Inclut tiroirs, portes, planches et quincaillerie. Comptoirs et accessoires souvent séparés.*

### EXEMPLES DE CUISINES COMPLÈTES

| Type de cuisine | Pieds linéaires typ. | Coût estimé total |
|-----------------|---------------------|-------------------|
| Petite cuisine (12-15 pl) – entrée gamme | 12-15 | 3 600$ - 9 000$ |
| Cuisine moyenne (20-25 pl) – sur mesure | 20-25 | 6 000$ - 15 000$ |
| Grande cuisine (30-40 pl) – haut gamme | 30-40 | 24 000$ - 48 000$+ |
| Cuisine luxe avec îlot (40+ pl) | 40+ | 48 000$ - 80 000$+ |

### EXEMPLES DE SALLES DE BAIN

| Type | Pieds linéaires typ. | Coût estimé |
|------|---------------------|-------------|
| Salle de bain simple (4-6 pl) | 4-6 | 400$ - 1 080$ |
| Salle de bain principale (6-10 pl) | 6-10 | 1 080$ - 3 500$ |
| Salle de bain luxe (10+ pl) | 10+ | 3 500$ - 8 000$+ |

### CE QUI EST INCLUS

✔ Caissons et façades (portes, tiroirs)
✔ Quincaillerie (charnières, glissières, poignées)
✔ Installation professionnelle
✔ Finition intérieure des armoires

### CE QUI N'EST PAS INCLUS

- Comptoirs (granit, quartz, stratifié) – budget séparé
- Électroménagers
- Évier et robinetterie
- Éclairage sous-armoires
- Accessoires organisateurs spéciaux

### MAIN-D'ŒUVRE ÉBÉNISTERIE

| Métier | Taux CCQ 2025 |
|--------|---------------|
| Ébéniste | 50$/heure |

## COÛTS BALCONS QUÉBEC 2025 (référence détaillée)

### CONSTRUCTION COMPLÈTE (structure + revêtement + installation)

| Type de balcon / matériau | Coût par pi² installé |
|---------------------------|----------------------|
| Fibre de verre (entrée/moyenne gamme) | 30$ à 45$ |
| Bois traité / bois standard | 48$ à 60$ |
| Composite (installé) | 50$ à 60$ |
| Cèdre rouge / bois torréfié | 60$ à 72$ |
| Béton (solide, durable) | 70$ à 85$ |

### DÉTAILS PAR MATÉRIAU

**🪚 Bois traité / Cèdre**
- Bois traité standard : 48$ à 60$/pi²
- Cèdre rouge ou bois torréfié : 60$ à 72$/pi²
- Option courante au Québec, demande entretien régulier

**🪵 Composite / Synthétique**
- Composite installé : 50$ à 60$/pi²
- Matériaux seuls : ~9$/pi² (installation en sus)
- Moins d'entretien que le bois

**🧱 Béton et Fibre de verre**
- Fibre de verre : 30$ à 45$/pi²
- Béton armé : 70$ à 85$/pi²
- Plus durable, structure solide

### EXEMPLES PAR SUPERFICIE DE BALCON

| Superficie | Fibre verre | Bois traité | Composite | Béton |
|------------|-------------|-------------|-----------|-------|
| 80 pi² (8x10) | 2 400$ - 3 600$ | 3 840$ - 4 800$ | 4 000$ - 4 800$ | 5 600$ - 6 800$ |
| 120 pi² (10x12) | 3 600$ - 5 400$ | 5 760$ - 7 200$ | 6 000$ - 7 200$ | 8 400$ - 10 200$ |
| 200 pi² (10x20) | 6 000$ - 9 000$ | 9 600$ - 12 000$ | 10 000$ - 12 000$ | 14 000$ - 17 000$ |

### CE QUI EST INCLUS

✔ Plate-forme du balcon
✔ Sous-structure porteuse
✔ Finition de surface
✔ Installation professionnelle

### CE QUI N'EST PAS INCLUS (coûts additionnels)

- Garde-corps (rampe, balustrade)
- Escaliers d'accès
- Aménagements haut de gamme
- Étanchéité avancée (membrane)
- Permis municipaux (requis si >60 cm de hauteur)

### FACTEURS DE MAJORATION

- Grande portée / design sur mesure
- Garde-corps en verre ou métal design
- Matériaux haut de gamme
- Accès difficile / étage élevé

## PRIX DÉTAILLÉS PAR CATÉGORIE AUTOCONSTRUCTION QUÉBEC 2025 (par pi² de superficie habitable PAR ÉTAGE)



| Catégorie | Économique | Standard | Haut de gamme |
|-----------|------------|----------|---------------|
| Fondation | 30-40$ | 40-52$ | 52-70$ |
| Structure | 22-30$ | 30-44$ | 44-60$ |
| Toiture | 13-17$ | 17-26$ | 26-40$ |
| Revêtement | 13-22$ | 22-35$ | 35-60$ |
| Fenêtres/Portes | 17-26$ | 26-44$ | 44-70$ |
| Isolation | 7-10$ | 10-16$ | 16-22$ |
| Électricité | 13-17$ | 17-26$ | 26-44$ |
| Plomberie | 10-16$ | 16-24$ | 24-40$ |
| CVAC | 13-22$ | 22-35$ | 35-52$ |
| Gypse/Peinture | 10-16$ | 16-22$ | 22-30$ |
| Planchers | 7-13$ | 13-26$ | 26-52$ |
| Cuisine | 7k-13k$ | 13k-30k$ | 30k-70k$ |
| Salle de bain | 4k-9k$ | 9k-22k$ | 22k-44k$ |

**NOTE IMPORTANTE**: Les coûts par catégorie sont basés sur la superficie HABITABLE par étage.
Pour une maison de 2 étages de 1500 pi² par étage (3000 pi² total habitable), 
le coût de Structure à 30$/pi² = 3000 x 30$ = 90 000$.

**RÉDUCTION AUTOCONSTRUCTION**: Ces prix reflètent déjà une réduction de ~15% par rapport aux prix avec entrepreneur général.

## FORMAT DE RÉPONSE JSON STRICT

{
  "extraction": {
    "type_projet": "CONSTRUCTION_NEUVE | AGRANDISSEMENT | RENOVATION | GARAGE | GARAGE_AVEC_ETAGE",
    "superficie_nouvelle_pi2": number,
    "nombre_etages": number,
    "plans_analyses": number,
    "categories": [
      {
        "nom": "Nom de la catégorie",
        "items": [
          {
            "description": "Description du matériau/travail",
            "quantite": number,
            "unite": "pi² | vg³ | ml | pcs | unité | forfait",
            "dimension": "dimension si applicable",
            "prix_unitaire": number,
            "total": number,
            "source": "Page X ou Estimé",
            "confiance": "haute | moyenne | basse"
          }
        ],
        "sous_total_materiaux": number,
        "heures_main_oeuvre": number,
        "taux_horaire_CCQ": number,
        "sous_total_main_oeuvre": number,
        "sous_total_categorie": number
      }
    ],
    "elements_manquants": ["Éléments non spécifiés"],
    "ambiguites": ["Informations ambiguës"],
    "incoherences": ["Incohérences détectées"]
  },
  "totaux": {
    "total_materiaux": number,
    "total_main_oeuvre": number,
    "sous_total_avant_taxes": number,
    "contingence_5_pourcent": number,
    "sous_total_avec_contingence": number,
    "tps_5_pourcent": number,
    "tvq_9_975_pourcent": number,
    "total_ttc": number
  },
  "validation": {
    "surfaces_completes": boolean,
    "ratio_main_oeuvre_materiaux": number,
    "ratio_acceptable": boolean,
    "alertes": ["Alertes importantes"]
  },
  "recommandations": ["Recommandations"],
  "resume_projet": "Description du projet"
}`;

type PageExtraction = {
  type_projet?: string;
  superficie_nouvelle_pi2?: number;
  nombre_etages?: number;
  plans_analyses?: number;
  categories?: any[];
  elements_manquants?: string[];
  ambiguites?: string[];
  incoherences?: string[];
};

function stripMarkdownCodeFences(text: string) {
  return String(text || "")
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

function safeParseJsonFromModel(text: string): any | null {
  try {
    let clean = stripMarkdownCodeFences(text);
    const jsonStart = clean.indexOf("{");
    if (jsonStart > 0) clean = clean.substring(jsonStart);

    try {
      return JSON.parse(clean);
    } catch {
      // Basic repair if truncated
      let braceCount = 0;
      let bracketCount = 0;
      for (const ch of clean) {
        if (ch === "{") braceCount++;
        if (ch === "}") braceCount--;
        if (ch === "[") bracketCount++;
        if (ch === "]") bracketCount--;
      }
      let repaired = clean;
      while (bracketCount > 0) {
        repaired += "]";
        bracketCount--;
      }
      while (braceCount > 0) {
        repaired += "}";
        braceCount--;
      }
      return JSON.parse(repaired);
    }
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(url: string, maxBytes: number): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) return null;
    const base64 = encodeBase64(arrayBuffer);
    const contentType = resp.headers.get('content-type') || 'image/png';
    const mediaType = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'image/jpeg'
      : contentType.includes('webp')
        ? 'image/webp'
        : 'image/png';
    return { base64, mediaType };
  } catch {
    return null;
  }
}

async function analyzeOnePageWithClaude({
  apiKey,
  imageBase64,
  mediaType,
  finishQualityLabel,
  pageNumber,
  totalPages,
  additionalNotes,
  projectType,
  manualContext,
}: {
  apiKey: string;
  imageBase64: string;
  mediaType: string;
  finishQualityLabel: string;
  pageNumber: number;
  totalPages: number;
  additionalNotes?: string;
  projectType?: string;
  manualContext?: {
    projectType?: string;
    squareFootage?: number;
    numberOfFloors?: number;
    hasGarage?: boolean;
    foundationSqft?: number;
    additionalNotes?: string;
  };
}): Promise<string | null> {
  // Build special instruction for "agrandissement" projects
  const effectiveProjectType = projectType || manualContext?.projectType || '';
  const isAgrandissement = effectiveProjectType.toLowerCase().includes('agrandissement');
  const agrandissementInstruction = isAgrandissement 
    ? `
## ⚠️ INSTRUCTION CRITIQUE - AGRANDISSEMENT (EXTENSION)

Ce projet est un **AGRANDISSEMENT** (extension d'un bâtiment existant).

### CE QUE TU DOIS FAIRE:
1. **Identifier visuellement** sur les plans ce qui est NOUVEAU vs. EXISTANT:
   - Lignes pointillées = généralement existant
   - Lignes pleines avec annotations "nouveau" ou "proposé" = à construire
   - Zones hachurées ou colorées différemment = souvent l'extension
   - Notes indiquant "existant", "à démolir", "nouveau"

2. **Calculer UNIQUEMENT pour la partie NOUVELLE**:
   - Périmètre de l'agrandissement (pas de la maison complète)
   - Superficie de l'extension seulement
   - Fondations pour la nouvelle partie uniquement
   - Nouveaux murs, fenêtres, portes ajoutés

3. **IGNORER COMPLÈTEMENT**:
   - Les dimensions du bâtiment existant
   - Les pièces existantes qui ne sont pas modifiées
   - Les éléments structuraux existants qui restent en place

4. **Éléments spécifiques aux agrandissements**:
   - Jonction entre l'existant et le nouveau (travaux de raccordement)
   - Ouvertures dans les murs existants
   - Raccordements électrique/plomberie à l'existant

### EXEMPLE:
Si le plan montre une maison de 1500 pi² avec un agrandissement de 400 pi²:
- "superficie_nouvelle_pi2" = 400 (PAS 1900)
- Le périmètre pour les fondations = périmètre de l'extension seulement (moins le mur mitoyen)

LIS ATTENTIVEMENT TOUTES LES NOTES sur les plans qui indiquent ce qui est nouveau!
` 
    : '';

  // Build context section from manual data
  const hasManualContext = manualContext && (manualContext.projectType || manualContext.squareFootage || manualContext.additionalNotes);
  const contextSection = hasManualContext ? `
## CONTEXTE CLIENT (pour affiner l'analyse)
${manualContext?.projectType ? `- Type de projet: ${manualContext.projectType}` : ''}
${manualContext?.squareFootage ? `- Superficie estimée: ${manualContext.squareFootage} pi²` : ''}
${manualContext?.numberOfFloors ? `- Nombre d'étages: ${manualContext.numberOfFloors}` : ''}
${manualContext?.hasGarage ? `- Garage inclus` : ''}
${manualContext?.foundationSqft ? `- Fondation: ${manualContext.foundationSqft} pi²` : ''}
${manualContext?.additionalNotes ? `
SPÉCIFICATIONS DU CLIENT:
${manualContext.additionalNotes}
(Utilise ces détails pour personnaliser les estimations: matériaux, équipements, finitions)
` : ''}
` : '';

  const pagePrompt = `Tu analyses la PAGE ${pageNumber}/${totalPages} d'un ensemble de plans de construction au Québec.

## ⚠️ LECTURE OBLIGATOIRE - TRÈS IMPORTANT

AVANT d'analyser les dimensions, tu DOIS:
1. **LIRE TOUTES LES NOTES ÉCRITES** sur ce plan - chaque annotation, légende, spécification
2. **Identifier les tableaux** de fenêtres/portes avec dimensions et types
3. **Repérer les indications** "existant"/"nouveau"/"proposé" si c'est un agrandissement
4. **Extraire les cotes** exactes pour calculer le périmètre (pied linéaire)
5. **Chercher les dimensions** du bâtiment pour calculer: Périmètre = 2 x (longueur + largeur)

Ne te fie PAS seulement à l'aspect visuel - LIS CHAQUE MOT inscrit sur le plan.

QUALITÉ DE FINITION: ${finishQualityLabel}
${additionalNotes ? `NOTES CLIENT: ${additionalNotes}` : ''}
${contextSection}
${agrandissementInstruction}

## OBJECTIF

- Extraire UNIQUEMENT ce qui est visible sur cette page (dimensions, quantités, matériaux)
- **CALCULER LE PÉRIMÈTRE** en pieds linéaires pour les fondations et murs
${isAgrandissement ? '- Pour un AGRANDISSEMENT, extrais SEULEMENT les éléments de la partie NOUVELLE (extension), pas le bâtiment existant.' : ''}
${hasManualContext ? '- PERSONNALISE les estimations selon les spécifications client.' : ''}
- Si une catégorie n'est pas visible sur cette page, ne l\'invente pas
- Retourne du JSON STRICT (sans texte autour), au format suivant:

{
  "extraction": {
    "type_projet": "CONSTRUCTION_NEUVE | AGRANDISSEMENT | RENOVATION | GARAGE | GARAGE_AVEC_ETAGE",
    "superficie_nouvelle_pi2": number,
    "perimetre_pi_lineaire": number,
    "nombre_etages": number,
    "plans_analyses": 1,
    "categories": [
      {
        "nom": string,
        "items": [
          {
            "description": string,
            "quantite": number,
            "unite": string,
            "dimension": string,
            "prix_unitaire": number,
            "total": number,
            "source": "Page ${pageNumber}",
            "confiance": "haute" | "moyenne" | "basse"
          }
        ],
        "sous_total_materiaux": number,
        "heures_main_oeuvre": number,
        "taux_horaire_CCQ": number,
        "sous_total_main_oeuvre": number,
        "sous_total_categorie": number
      }
    ],
    "elements_manquants": string[],
    "ambiguites": string[],
    "incoherences": string[]
  }
}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: SYSTEM_PROMPT_EXTRACTION,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: pagePrompt },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  return data.content?.[0]?.text || null;
}

function mid(min: number, max: number) {
  return (min + max) / 2;
}

function ensureAllMainCategoriesAndRecalc({
  mergedCategories,
  squareFootage,
  finishQuality,
}: {
  mergedCategories: any[];
  squareFootage: number;
  finishQuality: string;
}) {
  // Benchmarks ($/pi²) include materials+labour
  const perSqft: Record<string, { economique: [number, number]; standard: [number, number]; "haut-de-gamme": [number, number] }> = {
    "Fondation": { economique: [35, 45], standard: [45, 60], "haut-de-gamme": [60, 80] },
    "Structure": { economique: [25, 35], standard: [35, 50], "haut-de-gamme": [50, 70] },
    "Toiture": { economique: [15, 20], standard: [20, 30], "haut-de-gamme": [30, 45] },
    "Revêtement extérieur": { economique: [15, 25], standard: [25, 40], "haut-de-gamme": [40, 70] },
    "Fenêtres et portes": { economique: [20, 30], standard: [30, 50], "haut-de-gamme": [50, 80] },
    "Isolation et pare-air": { economique: [8, 12], standard: [12, 18], "haut-de-gamme": [18, 25] },
    "Électricité": { economique: [15, 20], standard: [20, 30], "haut-de-gamme": [30, 50] },
    "Plomberie": { economique: [12, 18], standard: [18, 28], "haut-de-gamme": [28, 45] },
    "Chauffage/CVAC": { economique: [15, 25], standard: [25, 40], "haut-de-gamme": [40, 60] },
    "Finition intérieure": { economique: [12, 18], standard: [18, 25], "haut-de-gamme": [25, 35] },
  };

  const fixed: Record<string, { economique: number; standard: number; "haut-de-gamme": number }> = {
    "Cuisine": { economique: mid(8000, 15000), standard: mid(15000, 35000), "haut-de-gamme": mid(35000, 80000) },
    // Assumption: 1 bathroom when unknown
    "Salle de bain": { economique: mid(5000, 10000), standard: mid(10000, 25000), "haut-de-gamme": mid(25000, 50000) },
  };

  const quality = (finishQuality === "economique" || finishQuality === "haut-de-gamme" || finishQuality === "standard")
    ? (finishQuality as "economique" | "standard" | "haut-de-gamme")
    : "standard";

  const normalize = (s: unknown) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const existingKeys = new Set(mergedCategories.map((c) => normalize(c.nom || c.name)));

  const required = [
    "Fondation",
    "Structure",
    "Toiture",
    "Revêtement extérieur",
    "Fenêtres et portes",
    "Isolation et pare-air",
    "Électricité",
    "Plomberie",
    "Chauffage/CVAC",
    "Finition intérieure",
    "Cuisine",
    "Salle de bain",
  ];

  const defaultLaborShare = 0.42; // within 35-50%

  for (const nom of required) {
    if (existingKeys.has(normalize(nom))) continue;

    let total = 0;
    if (perSqft[nom] && squareFootage > 0) {
      const [mn, mx] = perSqft[nom][quality];
      total = mid(mn, mx) * squareFootage;
    } else if (fixed[nom]) {
      total = fixed[nom][quality];
    }

    const sous_total_main_oeuvre = total * defaultLaborShare;
    const sous_total_materiaux = total - sous_total_main_oeuvre;

    mergedCategories.push({
      nom,
      items: [
        {
          description: "Estimation basée sur repères Québec 2025",
          quantite: 1,
          unite: "forfait",
          dimension: "",
          prix_unitaire: total,
          total,
          source: "Estimé",
          confiance: "basse",
        },
      ],
      sous_total_materiaux,
      heures_main_oeuvre: 0,
      taux_horaire_CCQ: 0,
      sous_total_main_oeuvre,
      sous_total_categorie: total,
    });
  }

  // Recompute subtotals consistently (and ensure labour isn't dropped)
  let totalMateriaux = 0;
  let totalMainOeuvre = 0;

  const normalizedCategories = mergedCategories.map((c) => {
    const itemsTotal = (c.items || []).reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0);
    let sousMat = Number(c.sous_total_materiaux);
    let sousMO = Number(c.sous_total_main_oeuvre);
    let sousCat = Number(c.sous_total_categorie);

    if (!Number.isFinite(sousMat) || sousMat <= 0) sousMat = itemsTotal;
    if (!Number.isFinite(sousMO) || sousMO < 0) sousMO = 0;

    // If category total missing, build it from materials + labour
    if (!Number.isFinite(sousCat) || sousCat <= 0) sousCat = sousMat + sousMO;

    // If labour missing but total suggests it, infer
    if (sousMO === 0 && sousCat > sousMat) sousMO = sousCat - sousMat;
    // If still missing, apply default labour share
    if (sousMO === 0 && sousMat > 0) sousMO = (sousMat * defaultLaborShare) / (1 - defaultLaborShare);

    sousCat = sousMat + sousMO;

    totalMateriaux += sousMat;
    totalMainOeuvre += sousMO;

    return {
      ...c,
      nom: c.nom || c.name,
      sous_total_materiaux: sousMat,
      sous_total_main_oeuvre: sousMO,
      sous_total_categorie: sousCat,
    };
  });

  const sousTotalAvantTaxes = normalizedCategories.reduce((sum: number, c: any) => sum + (Number(c.sous_total_categorie) || 0), 0);
  const contingence = sousTotalAvantTaxes * 0.05;
  const sousTotalAvecContingence = sousTotalAvantTaxes + contingence;
  const tps = sousTotalAvecContingence * 0.05;
  const tvq = sousTotalAvecContingence * 0.09975;
  const totalTtc = sousTotalAvecContingence + tps + tvq;

  const ratio = totalMateriaux > 0 ? totalMainOeuvre / totalMateriaux : null;
  const ratioAcceptable = ratio === null ? null : ratio >= 0.35 && ratio <= 0.5;

  return {
    categories: normalizedCategories,
    totaux: {
      total_materiaux: totalMateriaux,
      total_main_oeuvre: totalMainOeuvre,
      sous_total_avant_taxes: sousTotalAvantTaxes,
      contingence_5_pourcent: contingence,
      sous_total_avec_contingence: sousTotalAvecContingence,
      tps_5_pourcent: tps,
      tvq_9_975_pourcent: tvq,
      total_ttc: totalTtc,
    },
    validation: {
      surfaces_completes: false,
      ratio_main_oeuvre_materiaux: ratio,
      ratio_acceptable: ratioAcceptable,
      alertes: [],
    },
  };
}

function mergePageExtractions(pageExtractions: PageExtraction[]) {
  const normalizeKey = (s: unknown) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const catMap = new Map<string, any>();
  const missing = new Set<string>();
  const ambiguites = new Set<string>();
  const incoherences = new Set<string>();

  let typeProjet: string | undefined;
  let superficie: number | undefined;
  let etages: number | undefined;

  for (const ex of pageExtractions) {
    typeProjet = typeProjet || ex.type_projet;
    if (!superficie && Number(ex.superficie_nouvelle_pi2)) superficie = Number(ex.superficie_nouvelle_pi2);
    if (!etages && Number(ex.nombre_etages)) etages = Number(ex.nombre_etages);

    for (const e of ex.elements_manquants || []) missing.add(String(e));
    for (const e of ex.ambiguites || []) ambiguites.add(String(e));
    for (const e of ex.incoherences || []) incoherences.add(String(e));

    for (const cat of ex.categories || []) {
      const nom = cat.nom || cat.name || 'Autre';
      const key = normalizeKey(nom);
      const existing = catMap.get(key) || {
        nom,
        items: [],
        heures_main_oeuvre: 0,
        sous_total_main_oeuvre: 0,
        sous_total_materiaux: 0,
        taux_horaire_CCQ: Number(cat.taux_horaire_CCQ) || 0,
      };

      existing.heures_main_oeuvre += Number(cat.heures_main_oeuvre) || 0;
      existing.sous_total_main_oeuvre += Number(cat.sous_total_main_oeuvre) || 0;
      existing.sous_total_materiaux += Number(cat.sous_total_materiaux) || 0;
      existing.taux_horaire_CCQ = existing.taux_horaire_CCQ || Number(cat.taux_horaire_CCQ) || 0;

      // Merge items by description+unit+dimension
      const itemMap = new Map<string, any>();
      for (const it of existing.items) {
        const k = `${normalizeKey(it.description)}|${normalizeKey(it.unite)}|${normalizeKey(it.dimension)}`;
        itemMap.set(k, it);
      }
      for (const it of cat.items || []) {
        const desc = it.description;
        const unite = it.unite || it.unit;
        const dimension = it.dimension || '';
        const k = `${normalizeKey(desc)}|${normalizeKey(unite)}|${normalizeKey(dimension)}`;

        const quantite = Number(it.quantite) || 0;
        const prix = Number(it.prix_unitaire) || 0;
        const total = Number(it.total) || (quantite && prix ? quantite * prix : 0);

        const prev = itemMap.get(k);
        if (prev) {
          prev.quantite = (Number(prev.quantite) || 0) + quantite;
          prev.total = (Number(prev.total) || 0) + total;
          prev.prix_unitaire = Math.max(Number(prev.prix_unitaire) || 0, prix);
          prev.source = prev.source || it.source;
          itemMap.set(k, prev);
        } else {
          itemMap.set(k, {
            description: desc,
            quantite,
            unite,
            dimension,
            prix_unitaire: prix,
            total,
            source: it.source,
            confiance: it.confiance || 'moyenne',
          });
        }
      }
      existing.items = Array.from(itemMap.values());
      catMap.set(key, existing);
    }
  }

  return {
    typeProjet: typeProjet || 'GARAGE',
    superficie: superficie || 0,
    etages: etages || 1,
    categories: Array.from(catMap.values()),
    elements_manquants: Array.from(missing),
    ambiguites: Array.from(ambiguites),
    incoherences: Array.from(incoherences),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode, finishQuality = "standard", stylePhotoUrls = [], imageUrls: bodyImageUrls, imageUrl: singleImageUrl } = body;
    
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured - ANTHROPIC_API_KEY missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Quality level descriptions
    const qualityDescriptions: Record<string, string> = {
      "economique": "ÉCONOMIQUE - Matériaux entrée de gamme: plancher flottant 8mm, armoires mélamine, comptoirs stratifiés, portes creuses",
      "standard": "STANDARD - Bon rapport qualité-prix: bois franc ingénierie, armoires semi-custom, quartz, portes MDF pleines",
      "haut-de-gamme": "HAUT DE GAMME - Finitions luxueuses: bois franc massif, armoires sur mesure, granite/marbre, portes massives"
    };

    let imageUrls: string[] = [];
    
    // Handle image URLs
    if (mode === "plan") {
      if (bodyImageUrls && Array.isArray(bodyImageUrls)) {
        imageUrls = bodyImageUrls;
      } else if (singleImageUrl) {
        imageUrls = [singleImageUrl];
      }
      if (stylePhotoUrls && Array.isArray(stylePhotoUrls) && stylePhotoUrls.length > 0) {
        imageUrls = [...imageUrls, ...stylePhotoUrls];
      }
    } else if (stylePhotoUrls && Array.isArray(stylePhotoUrls) && stylePhotoUrls.length > 0) {
      imageUrls = [...stylePhotoUrls];
    }

    console.log('Analyzing:', { mode, imageCount: imageUrls.length, quality: finishQuality });

    // Build the prompt
    let extractionPrompt: string;
    
    // Check if project is an "agrandissement"
    const isAgrandissement = body.projectType?.toLowerCase().includes('agrandissement');
    const agrandissementInstruction = isAgrandissement
      ? `
INSTRUCTION CRITIQUE - AGRANDISSEMENT:
- Ce projet est un AGRANDISSEMENT (extension).
- IGNORE COMPLÈTEMENT le bâtiment existant sur les plans.
- Analyse et estime UNIQUEMENT la partie NOUVELLE de la construction (l'extension).
- Ne prends PAS en compte les dimensions, superficies ou éléments de la maison existante.
- La superficie doit correspondre UNIQUEMENT à la superficie de l'agrandissement.
`
      : '';
    
    if (mode === "plan") {
      // Mode plan ENRICHI: plans comme source principale + données manuelles comme contexte
      // Les données manuelles aident à préciser le type de projet et les spécifications
      const manualContext = body.manualContext || {};
      const materialChoices = manualContext.materialChoices || {};
      const hasManualContext = manualContext.projectType || manualContext.squareFootage || manualContext.additionalNotes;
      const hasMaterialChoices = Object.values(materialChoices).some(v => v);
      
      // Material choice labels for the prompt
      const materialLabels: Record<string, Record<string, string>> = {
        exteriorSiding: {
          "vinyle": "Revêtement vinyle",
          "canexel": "Canexel / Fibrociment",
          "bois": "Bois naturel",
          "brique": "Brique",
          "pierre": "Pierre / Placage de pierre",
          "aluminium": "Aluminium",
          "mixte": "Mixte (plusieurs matériaux)"
        },
        roofingType: {
          "bardeau-asphalte": "Bardeau d'asphalte standard",
          "bardeau-architectural": "Bardeau architectural",
          "metal": "Tôle / Métal",
          "elastomere": "Membrane élastomère (toit plat)",
          "tpo-epdm": "TPO / EPDM (toit plat)"
        },
        windowType: {
          "pvc-standard": "Fenêtres PVC standard double vitrage",
          "pvc-triple": "Fenêtres PVC triple vitrage",
          "aluminium": "Fenêtres aluminium",
          "pvc-alu": "Fenêtres PVC/Aluminium (PVC int, alu ext)",
          "bois": "Fenêtres bois massif"
        },
        insulationType: {
          "laine-standard": "Laine isolante standard",
          "laine-haute-densite": "Laine haute densité",
          "polyurethane": "Polyuréthane giclé",
          "cellulose": "Cellulose soufflée",
          "panneau-rigide": "Panneaux rigides (SIP)"
        },
        heatingType: {
          "plinthes": "Chauffage par plinthes électriques",
          "thermopompe-murale": "Thermopompe murale",
          "thermopompe-centrale": "Thermopompe centrale",
          "plancher-radiant": "Plancher radiant électrique",
          "plancher-radiant-hydro": "Plancher radiant hydronique",
          "bi-energie": "Bi-énergie (fournaise + thermopompe)",
          "geothermie": "Géothermie"
        },
        flooringType: {
          "flottant-stratifie": "Plancher flottant stratifié",
          "vinyle-luxe": "Vinyle de luxe (LVP)",
          "bois-ingenierie": "Bois d'ingénierie",
          "bois-franc": "Bois franc massif",
          "ceramique": "Céramique / Porcelaine",
          "beton-poli": "Béton poli"
        },
        cabinetType: {
          "melamine": "Armoires mélamine",
          "polyester": "Armoires polymère / polyester",
          "thermoplastique": "Armoires thermoplastique",
          "laque": "Armoires laque / acrylique",
          "bois-massif": "Armoires bois massif",
          "sur-mesure-haut-gamme": "Armoires sur mesure haut de gamme"
        },
        countertopType: {
          "stratifie": "Comptoirs stratifiés",
          "quartz": "Comptoirs quartz",
          "granit": "Comptoirs granit",
          "marbre": "Comptoirs marbre",
          "bois-boucher": "Comptoirs bloc de boucher (bois)",
          "beton": "Comptoirs béton",
          "dekton": "Comptoirs Dekton / Ultra-compact"
        }
      };

      const getMaterialLabel = (category: string, value: string | undefined): string | null => {
        if (!value) return null;
        return materialLabels[category]?.[value] || value;
      };

      const materialChoicesSection = hasMaterialChoices ? `
## CHOIX DE MATÉRIAUX SPÉCIFIÉS PAR LE CLIENT
${getMaterialLabel('exteriorSiding', materialChoices.exteriorSiding) ? `- REVÊTEMENT EXTÉRIEUR: ${getMaterialLabel('exteriorSiding', materialChoices.exteriorSiding)}` : ''}
${getMaterialLabel('roofingType', materialChoices.roofingType) ? `- TOITURE: ${getMaterialLabel('roofingType', materialChoices.roofingType)}` : ''}
${getMaterialLabel('windowType', materialChoices.windowType) ? `- FENÊTRES: ${getMaterialLabel('windowType', materialChoices.windowType)}` : ''}
${getMaterialLabel('insulationType', materialChoices.insulationType) ? `- ISOLATION: ${getMaterialLabel('insulationType', materialChoices.insulationType)}` : ''}
${getMaterialLabel('heatingType', materialChoices.heatingType) ? `- CHAUFFAGE/CVAC: ${getMaterialLabel('heatingType', materialChoices.heatingType)}` : ''}
${getMaterialLabel('flooringType', materialChoices.flooringType) ? `- PLANCHER: ${getMaterialLabel('flooringType', materialChoices.flooringType)}` : ''}
${getMaterialLabel('cabinetType', materialChoices.cabinetType) ? `- ARMOIRES CUISINE: ${getMaterialLabel('cabinetType', materialChoices.cabinetType)}` : ''}
${getMaterialLabel('countertopType', materialChoices.countertopType) ? `- COMPTOIRS: ${getMaterialLabel('countertopType', materialChoices.countertopType)}` : ''}

IMPORTANT: Utilise CES matériaux spécifiques pour l'estimation des coûts correspondants.
` : '';
      
      const contextSection = hasManualContext || hasMaterialChoices ? `
## CONTEXTE COMPLÉMENTAIRE FOURNI PAR LE CLIENT
${manualContext.projectType ? `- TYPE DE PROJET INDIQUÉ: ${manualContext.projectType}` : ''}
${manualContext.squareFootage ? `- SUPERFICIE ESTIMÉE: ${manualContext.squareFootage} pi² (à vérifier avec les plans)` : ''}
${manualContext.numberOfFloors ? `- NOMBRE D'ÉTAGES: ${manualContext.numberOfFloors}` : ''}
${manualContext.foundationSqft ? `- SUPERFICIE FONDATION: ${manualContext.foundationSqft} pi²` : ''}
${manualContext.hasGarage ? `- GARAGE: Inclus dans le projet` : ''}
${materialChoicesSection}
${manualContext.additionalNotes ? `
## NOTES ET SPÉCIFICATIONS ADDITIONNELLES
${manualContext.additionalNotes}

IMPORTANT: Utilise ces notes pour affiner ton estimation (équipements, finitions spéciales).
` : ''}
` : '';

      extractionPrompt = `Analyse ${imageUrls.length > 1 ? 'ces ' + imageUrls.length + ' plans' : 'ce plan'} de construction pour un projet AU QUÉBEC.

QUALITÉ DE FINITION: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}
${agrandissementInstruction}
${contextSection}
INSTRUCTIONS CRITIQUES:
1. Examine TOUTES les pages/images fournies ensemble
2. EXTRAIS les dimensions, superficies et quantités DIRECTEMENT des plans (source de vérité)
3. COMPARE avec le contexte client et SIGNALE toute incohérence
4. ${hasMaterialChoices ? 'UTILISE LES MATÉRIAUX SPÉCIFIÉS par le client pour calculer les coûts (revêtement, toiture, plancher, armoires, etc.)' : (hasManualContext ? 'Utilise les notes du client pour PRÉCISER les matériaux, équipements et finitions' : 'DÉDUIS le type de projet et le nombre d\'étages à partir des plans')}
${isAgrandissement ? '5. Pour un AGRANDISSEMENT: analyse SEULEMENT la partie NOUVELLE, ignore le bâtiment existant' : ''}
6. Pour chaque catégorie NON VISIBLE, ESTIME les coûts basés sur la superficie EXTRAITE + les spécifications client
7. Tu DOIS retourner TOUTES les 12 catégories principales (Fondation, Structure, Toiture, Revêtement, Fenêtres, Isolation, Électricité, Plomberie, CVAC, Finition, Cuisine, Salle de bain)
8. Applique les prix du marché Québec 2025
9. ${hasMaterialChoices ? 'Les matériaux du client REMPLACENT les valeurs par défaut - utilise les prix correspondants' : (hasManualContext ? 'PERSONNALISE l\'estimation selon les notes' : '')}

Retourne le JSON structuré COMPLET avec TOUTES les catégories.`;
    } else {
      // Manual mode
      const { projectType, squareFootage, numberOfFloors, hasGarage, foundationSqft, floorSqftDetails, additionalNotes } = body;
      
      extractionPrompt = `Génère une estimation budgétaire COMPLÈTE pour ce projet au QUÉBEC en 2025.

## PROJET À ESTIMER
- TYPE: ${projectType || 'Maison unifamiliale'}
- ÉTAGES: ${numberOfFloors || 1}
- SUPERFICIE TOTALE: ${squareFootage || 1500} pi²
${foundationSqft ? `- FONDATION: ${foundationSqft} pi²` : ''}
${floorSqftDetails?.length ? `- DÉTAIL ÉTAGES: ${floorSqftDetails.join(', ')} pi²` : ''}
- GARAGE: ${hasGarage ? 'Oui (attaché)' : 'Non'}
- QUALITÉ: ${qualityDescriptions[finishQuality] || qualityDescriptions["standard"]}
${additionalNotes ? `
## NOTES ET SPÉCIFICATIONS DU CLIENT
${additionalNotes}

IMPORTANT: Personnalise l'estimation selon ces notes (matériaux, équipements spécifiques, etc.)
` : ''}
${isAgrandissement ? `
INSTRUCTION CRITIQUE - AGRANDISSEMENT:
- Ce projet est un AGRANDISSEMENT. La superficie indiquée est celle de l'extension UNIQUEMENT.
- NE PAS estimer de coûts pour le bâtiment existant.
` : ''}

INSTRUCTIONS CRITIQUES:
1. Tu DOIS retourner TOUTES les 12 catégories principales
2. Utilise les prix du MILIEU de la fourchette pour la qualité sélectionnée
3. Inclus matériaux ET main-d'œuvre pour chaque catégorie
4. Calcule contingence 5% + TPS 5% + TVQ 9.975%
5. ${additionalNotes ? 'PERSONNALISE selon les notes client (ex: thermopompe, plancher chauffant, balcon, etc.)' : ''}

Retourne le JSON structuré COMPLET.`;
    }

    let finalContent: string;

    if (mode === 'plan' && imageUrls.length > 0) {
      // CRITICAL: Limit to MAX 3 images to avoid CPU time limit (WORKER_LIMIT error)
      // Edge functions have strict CPU limits - processing more images causes timeout
      const MAX_IMAGES = 3;
      const imagesToProcess = imageUrls.slice(0, MAX_IMAGES);
      const totalOriginal = imageUrls.length;
      
      if (totalOriginal > MAX_IMAGES) {
        console.log(`⚠️ Limiting analysis to ${MAX_IMAGES} images (received ${totalOriginal}). Upload fewer plans or combine into single pages.`);
      }
      
      console.log(`Starting sequential plan analysis for ${imagesToProcess.length} images...`);

      const maxBytesPerImage = 2_000_000; // ~2MB to stay safe and reduce CPU usage
      const pageExtractions: PageExtraction[] = [];
      let skipped = 0;

      const finishQualityLabel = qualityDescriptions[finishQuality] || qualityDescriptions["standard"];

      for (let i = 0; i < imagesToProcess.length; i++) {
        const url = imagesToProcess[i];
        console.log(`Processing image ${i + 1}/${imagesToProcess.length}...`);

        const img = await fetchImageAsBase64(url, maxBytesPerImage);
        if (!img) {
          skipped++;
          console.log(`Skipping image ${i + 1} (fetch failed or too large)`);
          continue;
        }

        const manualContext = body.manualContext || {};
        const pageText = await analyzeOnePageWithClaude({
          apiKey: anthropicKey,
          imageBase64: img.base64,
          mediaType: img.mediaType,
          finishQualityLabel,
          pageNumber: i + 1,
          totalPages: imagesToProcess.length,
          additionalNotes: manualContext.additionalNotes || body.additionalNotes,
          projectType: manualContext.projectType || body.projectType,
          manualContext: manualContext,
        });

        const parsed = pageText ? safeParseJsonFromModel(pageText) : null;
        const extraction = (parsed?.extraction || parsed) as PageExtraction | undefined;
        if (extraction && Array.isArray(extraction.categories)) {
          pageExtractions.push(extraction);
          console.log(`Image ${i + 1} analyzed (categories: ${extraction.categories.length})`);
        } else {
          console.log(`Image ${i + 1} returned non-parseable JSON`);
        }
      }

      if (pageExtractions.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Impossible d'analyser les plans. Images trop lourdes/illisibles ou erreur IA.",
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const merged = mergePageExtractions(pageExtractions);
      // Use manual context as fallback for values not extracted from plans
      const manualCtx = body.manualContext || {};
      const sqftFallback = Number(manualCtx.squareFootage) || Number(body.squareFootage) || 0;
      const sqft = merged.superficie || sqftFallback;
      const etagesFallback = Number(manualCtx.numberOfFloors) || 1;
      const etages = merged.etages || etagesFallback;

      const completed = ensureAllMainCategoriesAndRecalc({
        mergedCategories: merged.categories,
        squareFootage: sqft,
        finishQuality,
      });

      // Generate descriptive project summary based on analysis + manual context
      const typeProjetDisplay = (merged.typeProjet || manualCtx.projectType || 'Construction neuve')
        .replace('_', ' ')
        .toLowerCase()
        .replace(/^\w/, (c: string) => c.toUpperCase());
      
      const plansCount = imagesToProcess.length - skipped;
      const hasManualNotes = manualCtx.additionalNotes ? ' (avec spécifications client)' : '';
      const limitNote = totalOriginal > MAX_IMAGES ? ` (limité à ${MAX_IMAGES} sur ${totalOriginal} plans)` : '';
      const resumeProjet = `Analyse de ${plansCount} plan(s)${limitNote} - ${typeProjetDisplay} de ${sqft} pi² sur ${etages} étage(s)${hasManualNotes}`;

      const budgetData = {
        extraction: {
          type_projet: merged.typeProjet,
          superficie_nouvelle_pi2: sqft,
          nombre_etages: merged.etages,
          plans_analyses: plansCount,
          categories: completed.categories,
          elements_manquants: merged.elements_manquants,
          ambiguites: merged.ambiguites,
          incoherences: merged.incoherences,
        },
        totaux: completed.totaux,
        validation: completed.validation,
        recommandations: [
          "Analyse multi-pages: extraction séquentielle + complétion automatique des catégories manquantes.",
        ],
        resume_projet: resumeProjet,
      };

      finalContent = JSON.stringify(budgetData);
      console.log('Plan analysis complete - categories:', budgetData.extraction.categories.length);
    } else {
      // Manual mode or no images: text-only call
      console.log('Analyzing with Claude (text mode)...');
      
      const textResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: SYSTEM_PROMPT_EXTRACTION,
          messages: [{ role: 'user', content: extractionPrompt }],
        }),
      });

      if (!textResp.ok) {
        const txt = await textResp.text();
        console.error('Claude text error:', textResp.status, txt);
        return new Response(
          JSON.stringify({ success: false, error: `Claude API failed: ${textResp.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const textData = await textResp.json();
      finalContent = textData.content?.[0]?.text || '';
      console.log('Claude text analysis complete');
    }

    if (!finalContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Réponse vide de l\'IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the final JSON
    let budgetData;
    try {
      let cleanContent = finalContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const jsonStart = cleanContent.indexOf('{');
      if (jsonStart > 0) {
        cleanContent = cleanContent.substring(jsonStart);
      }
      
      try {
        budgetData = JSON.parse(cleanContent);
      } catch (firstTry) {
        console.log('JSON appears truncated, attempting to repair...');
        
        let braceCount = 0;
        let bracketCount = 0;
        for (const char of cleanContent) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
        }
        
        let repairedContent = cleanContent;
        while (bracketCount > 0) {
          repairedContent += ']';
          bracketCount--;
        }
        while (braceCount > 0) {
          repairedContent += '}';
          braceCount--;
        }
        
        try {
          budgetData = JSON.parse(repairedContent);
          console.log('JSON repair successful');
        } catch (secondTry) {
          console.error('JSON repair failed, creating fallback response');
          budgetData = {
            extraction: {
              type_projet: "ANALYSE_INCOMPLETE",
              superficie_nouvelle_pi2: 0,
              nombre_etages: 1,
              categories: [],
              elements_manquants: ["L'analyse a été interrompue - veuillez réessayer"]
            },
            totaux: { total_ttc: 0 },
            recommandations: ["Veuillez relancer l'analyse - la réponse a été tronquée"],
            resume_projet: "Analyse incomplète"
          };
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', finalContent?.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Échec de l\'analyse - veuillez réessayer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform to expected format for frontend compatibility
    const transformedData = transformToLegacyFormat(budgetData, finishQuality);

    console.log('Analysis complete - categories:', transformedData.categories?.length || 0);

    return new Response(
      JSON.stringify({ success: true, data: transformedData, rawAnalysis: budgetData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error analyzing plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze plan';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Transform the new detailed format to legacy format for frontend compatibility
function transformToLegacyFormat(data: any, finishQuality: string): any {
  if (data.categories && Array.isArray(data.categories) && data.categories[0]?.budget !== undefined) {
    return data;
  }

  const extraction = data.extraction || data;
  const totaux = data.totaux || {};
  const validation = data.validation || {};

  const categories = (extraction.categories || []).map((cat: any) => ({
    name: cat.nom || cat.name,
    budget: cat.sous_total_categorie || cat.budget || 0,
    description: `${cat.items?.length || 0} items - Main-d'œuvre: ${cat.heures_main_oeuvre || 0}h`,
    items: (cat.items || []).map((item: any) => ({
      name: `${item.description} (${item.source || 'N/A'})`,
      cost: item.total || item.cost || 0,
      quantity: String(item.quantite || item.quantity || ''),
      unit: item.unite || item.unit || ''
    }))
  }));

  // Add budget imprévu and taxes as categories
  if (totaux.contingence_5_pourcent) {
    categories.push({
      name: "Budget imprévu (5%)",
      budget: totaux.contingence_5_pourcent,
      description: "Budget imprévu",
      items: [{ name: "Budget imprévu 5%", cost: totaux.contingence_5_pourcent, quantity: "1", unit: "forfait" }]
    });
  }

  if (totaux.tps_5_pourcent || totaux.tvq_9_975_pourcent) {
    const tps = totaux.tps_5_pourcent || 0;
    const tvq = totaux.tvq_9_975_pourcent || 0;
    categories.push({
      name: "Taxes",
      budget: tps + tvq,
      description: "TPS 5% + TVQ 9.975%",
      items: [
        { name: "TPS (5%)", cost: tps, quantity: "1", unit: "taxe" },
        { name: "TVQ (9.975%)", cost: tvq, quantity: "1", unit: "taxe" }
      ]
    });
  }

  const warnings = [
    ...(extraction.elements_manquants || []).map((e: string) => `⚠️ Élément manquant: ${e}`),
    ...(extraction.ambiguites || []).map((e: string) => `❓ Ambiguïté: ${e}`),
    ...(extraction.incoherences || []).map((e: string) => `⚡ Incohérence: ${e}`),
    ...(validation.alertes || [])
  ];

  const projectType = (extraction.type_projet || "").toUpperCase();
  const isAttachedOrExtension = projectType.includes("AGRANDISSEMENT") || 
                                 projectType.includes("GARAGE") || 
                                 projectType.includes("JUMELÉ") ||
                                 projectType.includes("JUMELE") ||
                                 projectType.includes("ANNEXE");

  warnings.push("🏗️ PRÉPARATION DU SITE: Vérifier les coûts d'excavation, nivellement, et accès chantier");
  warnings.push("🚧 PERMIS ET INSPECTIONS: Frais de permis de construction et inspections municipales à prévoir");
  warnings.push("📋 SERVICES PUBLICS: Confirmer les raccordements (eau, égout, électricité, gaz) et frais associés");

  if (isAttachedOrExtension) {
    warnings.push("🔗 JUMELAGE STRUCTUREL: Travaux de connexion à la structure existante (linteaux, ancrages, renfort fondation)");
    warnings.push("⚡ RACCORDEMENT ÉLECTRIQUE: Extension du panneau existant et mise aux normes possiblement requise");
    warnings.push("🔌 RACCORDEMENT PLOMBERIE: Connexion aux systèmes existants (eau, drainage, chauffage)");
    warnings.push("🏠 IMPERMÉABILISATION: Joint d'étanchéité entre nouvelle et ancienne construction critique");
    warnings.push("🎨 HARMONISATION: Travaux de finition pour raccorder les matériaux extérieurs existants");
    warnings.push("🔥 COUPE-FEU: Vérifier les exigences de séparation coupe-feu entre garage et habitation");
  }

  return {
    projectType: extraction.type_projet || "CONSTRUCTION_NEUVE",
    projectSummary: data.resume_projet || `Projet de ${extraction.superficie_nouvelle_pi2 || 0} pi² - ${extraction.nombre_etages || 1} étage(s)`,
    estimatedTotal: totaux.total_ttc || totaux.sous_total_avant_taxes || 0,
    newSquareFootage: extraction.superficie_nouvelle_pi2 || 0,
    plansAnalyzed: extraction.plans_analyses || 1,
    finishQuality: finishQuality,
    categories,
    recommendations: data.recommandations || [],
    warnings,
    validation: {
      surfacesCompletes: validation.surfaces_completes,
      ratioMainOeuvre: validation.ratio_main_oeuvre_materiaux,
      ratioAcceptable: validation.ratio_acceptable
    },
    totauxDetails: totaux
  };
}
