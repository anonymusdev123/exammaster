
import { Importance } from '../types';

// Template piani studio per materie comuni - CARICAMENTO ISTANTANEO
export const STUDY_TEMPLATES: Record<string, any> = {
  "Statistica": {
    modules: [
      { day: 1, topics: ["Statistica Descrittiva"], tasks: ["[TEORIA] Media, moda, mediana - 1.5h", "[TEORIA] Varianza e deviazione standard - 1.5h", "[PRATICA] Esercizi calcolo statistiche - 1h", "[PRATICA] Active recall definizioni - 1h"], priority: Importance.HIGH },
      { day: 2, topics: ["Probabilità Base"], tasks: ["[TEORIA] Eventi e probabilità - 1.5h", "[TEORIA] Probabilità condizionata - 1.5h", "[PRATICA] Esercizi su probabilità - 1h", "[PRATICA] Ripasso concetti - 1h"], priority: Importance.HIGH },
      { day: 3, topics: ["Variabili Aleatorie"], tasks: ["[TEORIA] Variabili discrete - 1.5h", "[TEORIA] Variabili continue - 1.5h", "[PRATICA] Esercizi variabili - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 4, topics: ["Distribuzioni"], tasks: ["[TEORIA] Normale e Binomiale - 1.5h", "[TEORIA] Poisson e Uniforme - 1.5h", "[PRATICA] Esercizi distribuzioni - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 5, topics: ["Inferenza"], tasks: ["[TEORIA] Test ipotesi - 1.5h", "[TEORIA] Intervalli confidenza - 1.5h", "[PRATICA] Esercizi inferenza - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 6, topics: ["Regressione"], tasks: ["[TEORIA] Regressione lineare - 1.5h", "[TEORIA] Correlazione - 1.5h", "[PRATICA] Esercizi regressione - 1h", "[PRATICA] Ripasso finale - 1h"], priority: Importance.MEDIUM }
    ]
  },
  "Microeconomia": {
    modules: [
      { day: 1, topics: ["Domanda e Offerta"], tasks: ["[TEORIA] Curve domanda/offerta - 1.5h", "[TEORIA] Equilibrio mercato - 1.5h", "[PRATICA] Esercizi grafici - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.HIGH },
      { day: 2, topics: ["Elasticità"], tasks: ["[TEORIA] Elasticità prezzo - 1.5h", "[TEORIA] Elasticità incrociata - 1.5h", "[PRATICA] Calcoli elasticità - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 3, topics: ["Teoria Consumatore"], tasks: ["[TEORIA] Utilità e preferenze - 1.5h", "[TEORIA] Vincolo bilancio - 1.5h", "[PRATICA] Esercizi ottimizzazione - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 4, topics: ["Teoria Produzione"], tasks: ["[TEORIA] Funzioni produzione - 1.5h", "[TEORIA] Costi produzione - 1.5h", "[PRATICA] Esercizi costi - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 5, topics: ["Mercati"], tasks: ["[TEORIA] Concorrenza perfetta - 1.5h", "[TEORIA] Monopolio - 1.5h", "[PRATICA] Esercizi mercati - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 6, topics: ["Oligopolio"], tasks: ["[TEORIA] Modelli oligopolio - 1.5h", "[TEORIA] Teoria giochi - 1.5h", "[PRATICA] Esercizi strategia - 1h", "[PRATICA] Ripasso finale - 1h"], priority: Importance.MEDIUM }
    ]
  },
  "Analisi Matematica": {
    modules: [
      { day: 1, topics: ["Limiti"], tasks: ["[TEORIA] Definizione limiti - 1.5h", "[TEORIA] Calcolo limiti - 1.5h", "[PRATICA] Esercizi limiti - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.HIGH },
      { day: 2, topics: ["Derivate"], tasks: ["[TEORIA] Regole derivazione - 1.5h", "[TEORIA] Derivate composte - 1.5h", "[PRATICA] Esercizi derivate - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 3, topics: ["Studio Funzione"], tasks: ["[TEORIA] Massimi e minimi - 1.5h", "[TEORIA] Concavità e flessi - 1.5h", "[PRATICA] Grafici funzioni - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.HIGH },
      { day: 4, topics: ["Integrali"], tasks: ["[TEORIA] Integrali indefiniti - 1.5h", "[TEORIA] Integrali definiti - 1.5h", "[PRATICA] Esercizi integrazione - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 5, topics: ["Serie"], tasks: ["[TEORIA] Serie numeriche - 1.5h", "[TEORIA] Criteri convergenza - 1.5h", "[PRATICA] Esercizi serie - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 6, topics: ["Equazioni Differenziali"], tasks: ["[TEORIA] Equazioni primo ordine - 1.5h", "[TEORIA] Equazioni secondo ordine - 1.5h", "[PRATICA] Esercizi EDO - 1h", "[PRATICA] Ripasso finale - 1h"], priority: Importance.MEDIUM }
    ]
  },
  "Fisica": {
    modules: [
      { day: 1, topics: ["Cinematica"], tasks: ["[TEORIA] Moto rettilineo - 1.5h", "[TEORIA] Moto parabolico - 1.5h", "[PRATICA] Esercizi cinematica - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.HIGH },
      { day: 2, topics: ["Dinamica"], tasks: ["[TEORIA] Leggi Newton - 1.5h", "[TEORIA] Forze e lavoro - 1.5h", "[PRATICA] Esercizi dinamica - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 3, topics: ["Energia"], tasks: ["[TEORIA] Conservazione energia - 1.5h", "[TEORIA] Energia potenziale - 1.5h", "[PRATICA] Esercizi energia - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.HIGH },
      { day: 4, topics: ["Termodinamica"], tasks: ["[TEORIA] Primo principio - 1.5h", "[TEORIA] Secondo principio - 1.5h", "[PRATICA] Esercizi termodinamica - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.MEDIUM },
      { day: 5, topics: ["Elettromagnetismo"], tasks: ["[TEORIA] Campo elettrico - 1.5h", "[TEORIA] Campo magnetico - 1.5h", "[PRATICA] Esercizi campi - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 6, topics: ["Onde"], tasks: ["[TEORIA] Onde meccaniche - 1.5h", "[TEORIA] Onde elettromagnetiche - 1.5h", "[PRATICA] Esercizi onde - 1h", "[PRATICA] Ripasso finale - 1h"], priority: Importance.LOW }
    ]
  },
  "Informatica": {
    modules: [
      { day: 1, topics: ["Algoritmi Base"], tasks: ["[TEORIA] Complessità algoritmi - 1.5h", "[TEORIA] Strutture dati - 1.5h", "[PRATICA] Coding esercizi - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.HIGH },
      { day: 2, topics: ["Programmazione OOP"], tasks: ["[TEORIA] Classi e oggetti - 1.5h", "[TEORIA] Ereditarietà - 1.5h", "[PRATICA] Esercizi OOP - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 3, topics: ["Database"], tasks: ["[TEORIA] SQL base - 1.5h", "[TEORIA] Normalizzazione - 1.5h", "[PRATICA] Query SQL - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 4, topics: ["Reti"], tasks: ["[TEORIA] Modello OSI - 1.5h", "[TEORIA] Protocolli TCP/IP - 1.5h", "[PRATICA] Esercizi reti - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.MEDIUM },
      { day: 5, topics: ["Sistemi Operativi"], tasks: ["[TEORIA] Processi e thread - 1.5h", "[TEORIA] Gestione memoria - 1.5h", "[PRATICA] Esercizi SO - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.LOW },
      { day: 6, topics: ["Sicurezza"], tasks: ["[TEORIA] Crittografia - 1.5h", "[TEORIA] Autenticazione - 1.5h", "[PRATICA] Esercizi sicurezza - 1h", "[PRATICA] Ripasso finale - 1h"], priority: Importance.LOW }
    ]
  },
  "Etica": {
    modules: [
      { day: 1, topics: ["Etica Normativa"], tasks: ["[TEORIA] Deontologia Kant - 1.5h", "[TEORIA] Utilitarismo Mill - 1.5h", "[PRATICA] Casi studio etici - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.HIGH },
      { day: 2, topics: ["Etica Applicata"], tasks: ["[TEORIA] Bioetica - 1.5h", "[TEORIA] Etica professionale - 1.5h", "[PRATICA] Dilemmi morali - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.HIGH },
      { day: 3, topics: ["Filosofia Morale"], tasks: ["[TEORIA] Aristotele virtù - 1.5h", "[TEORIA] Contrattualismo - 1.5h", "[PRATICA] Analisi testi - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.MEDIUM },
      { day: 4, topics: ["Etica Contemporanea"], tasks: ["[TEORIA] Rawls giustizia - 1.5h", "[TEORIA] Singer etica animale - 1.5h", "[PRATICA] Dibattiti etici - 1h", "[PRATICA] Ripasso - 1h"], priority: Importance.MEDIUM },
      { day: 5, topics: ["Metaetica"], tasks: ["[TEORIA] Realismo morale - 1.5h", "[TEORIA] Relativismo - 1.5h", "[PRATICA] Esercizi critici - 1h", "[PRATICA] Active recall - 1h"], priority: Importance.LOW },
      { day: 6, topics: ["Etica Digitale"], tasks: ["[TEORIA] Privacy e dati - 1.5h", "[TEORIA] IA ed etica - 1.5h", "[PRATICA] Casi contemporanei - 1h", "[PRATICA] Ripasso finale - 1h"], priority: Importance.MEDIUM }
    ]
  }
};

export function getTemplate(courseName: string) {
  const normalizedCourse = courseName.toLowerCase();
  for (const [templateName, template] of Object.entries(STUDY_TEMPLATES)) {
    if (normalizedCourse.includes(templateName.toLowerCase()) || 
        templateName.toLowerCase().includes(normalizedCourse)) {
      return template;
    }
  }
  return null;
}

export function hasTemplate(courseName: string): boolean {
  return getTemplate(courseName) !== null;
}
