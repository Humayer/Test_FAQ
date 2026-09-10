/**
 * Default keyword/synonym sets keyed by (lowercased) FAQTopic.purpose.
 * These seed the `FAQTopic.keywords` column on first import. Admins can
 * later edit the keyword list per topic from the admin panel — this file is
 * only the initial suggestion, not a hard-coded routing table.
 */
export const DEFAULT_SYNONYMS: Record<string, string[]> = {
  "recruitment & hiring": ["recruitment", "hiring", "job", "vacancy", "interview", "new hire", "job opening"],
  hris: ["hris", "hr system", "employee portal", "hr information system", "self service portal"],
  "employee handbook & company policy": [
    "handbook",
    "company policy",
    "policy",
    "employee handbook",
    "rules",
    "code of conduct",
  ],
  "health safety support": ["health", "safety", "first aid", "workplace safety", "injury", "accident"],
  "payroll & gratuity": ["salary", "pay", "payroll", "salary payment", "gratuity", "pay slip", "payslip"],
  "internship allowance": ["intern allowance", "internship allowance", "intern stipend", "internship pay"],
  "provident fund": ["pf", "provident", "provident fund", "pf balance", "pf withdrawal"],
  loan: ["loan", "salary advance", "advance", "employee loan"],
  "income tax": ["tax", "income tax", "tax return", "tax certificate", "tax deduction"],
  "medical claim": ["medical", "medical claim", "medical reimbursement", "hospital bill", "medical expense", "insurance claim"],
  transportation: ["transport", "transportation", "office bus", "office transport", "pick up", "drop off", "shuttle"],
  "official documents (all certificates)": [
    "certificate",
    "employment certificate",
    "experience certificate",
    "official document",
    "hr document",
    "salary certificate",
    "noc",
    "no objection certificate",
    "id card",
  ],
  "office maintenance & repair": ["maintenance", "repair", "office repair", "ac not working", "furniture", "broken"],
  "official events": ["event", "official event", "company event", "annual event", "party"],
  "qka exam & preparation": ["qka", "exam", "qka exam", "certification exam"],
  sports: ["sports", "sports day", "tournament", "games"],
  "bank card & cheque book": ["bank card", "atm card", "debit card", "cheque", "check book", "cheque book", "chequebook"],
  "office lunch & snacks": ["lunch", "snacks", "food", "office lunch", "cafeteria", "meal"],
  "employee offboarding process": ["resignation", "resign", "exit", "leaving", "offboarding", "notice period", "clearance"],
  "employee onboarding (intern to full time)": [
    "onboarding",
    "joining",
    "intern to full time",
    "full-time conversion",
    "confirmation",
    "permanent employee",
  ],
  "female welfarre": ["female welfare", "maternity", "women", "female employee", "maternity leave"],
  "guest/visitors": ["guest", "visitor", "visitors", "guest pass", "office visitor"],
  "lost & found": ["lost", "lost item", "lost property", "found item", "missing item"],
};

export function getDefaultSynonyms(purpose: string): string[] {
  return DEFAULT_SYNONYMS[purpose.trim().toLowerCase()] ?? [];
}
