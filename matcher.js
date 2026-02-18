// =============================
// SkillMatch - Vanilla JS Matcher
// =============================

// --- Skill dictionary (expand anytime)
const SKILLS = {
  "javascript": ["javascript", "js", "ecmascript"],
  "html": ["html", "html5"],
  "css": ["css", "css3"],
  "react": ["react", "reactjs"],
  "node.js": ["node", "nodejs", "node.js"],
  "express": ["express", "expressjs"],
  "sql": ["sql", "mysql", "postgres", "postgresql", "sqlite"],
  "mongodb": ["mongodb", "mongo"],
  "git": ["git", "github", "gitlab"],
  "docker": ["docker"],
  "aws": ["aws", "amazon web services"],
  "java": ["java"],
  "python": ["python"],
  "c++": ["c++", "cpp"],
  "c": ["c language", " c "],
  "dsa": ["dsa", "data structures", "algorithms", "data structures and algorithms"],
  "machine learning": ["machine learning", "ml"],
  "data analysis": ["data analysis", "data analytics", "analytics"],
  "excel": ["excel", "ms excel"],
  "power bi": ["power bi", "powerbi"],
  "tableau": ["tableau"],
  "linux": ["linux", "ubuntu"],
  "rest api": ["rest", "rest api", "restful api"],
  "typescript": ["typescript", "ts"],
  "next.js": ["next.js", "nextjs", "next"],
};

// Education keywords
const EDU = {
  "b.tech": ["btech", "b.tech", "bachelor of technology"],
  "b.e": ["be", "b.e", "bachelor of engineering"],
  "b.sc": ["bsc", "b.sc", "bachelor of science"],
  "m.tech": ["mtech", "m.tech", "master of technology"],
  "mca": ["mca", "master of computer applications"],
  "mba": ["mba", "master of business administration"],
  "phd": ["phd", "doctorate"],
};

// Certifications keywords (simple)
const CERTS = {
  "aws certified": ["aws certified", "aws certification"],
  "google cloud": ["google cloud", "gcp certification", "google cloud certified"],
  "azure": ["azure certification", "microsoft azure"],
  "coursera": ["coursera certificate", "coursera certification"],
  "nptel": ["nptel"],
};

// --- Utilities
function normalizeText(s){
  return (s || "")
    .toLowerCase()
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[•·]/g, " ")
    .replace(/[^a-z0-9\n\+\.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(arr){
  return Array.from(new Set(arr));
}

function containsAny(text, variants){
  for(const v of variants){
    // word boundary-ish matching
    const safe = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("(^|\\s)" + safe + "(\\s|$)", "i");
    if(re.test(text)) return true;
  }
  return false;
}

function extractFromDict(text, dict){
  const found = [];
  for(const canonical in dict){
    if(containsAny(text, dict[canonical])) found.push(canonical);
  }
  return unique(found);
}

// --- Resume section splitting (basic)
function splitSections(raw){
  const text = raw || "";
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  const sectionNames = [
    "skills", "technical skills", "projects", "experience", "work experience",
    "education", "certifications", "achievements", "summary"
  ];

  const sections = {};
  let current = "other";
  sections[current] = [];

  for(const line of lines){
    const lower = line.toLowerCase();

    let matched = null;
    for(const name of sectionNames){
      if(lower === name || lower.startsWith(name + ":")){
        matched = name;
        break;
      }
    }

    if(matched){
      current = matched;
      if(!sections[current]) sections[current] = [];
      continue;
    }

    sections[current].push(line);
  }

  // join back
  const joined = {};
  for(const k in sections){
    joined[k] = sections[k].join("\n");
  }
  return joined;
}

// --- Anonymize (simple)
function anonymizeResume(text){
  if(!text) return "";

  let t = text;

  // emails
  t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email removed]");

  // phone numbers (basic)
  t = t.replace(/(\+?\d{1,3}[\s-]?)?(\(?\d{3,5}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/g, "[phone removed]");

  // linkedin / urls
  t = t.replace(/https?:\/\/\S+/g, "[link removed]");
  t = t.replace(/www\.[^\s]+/g, "[link removed]");

  return t;
}

// --- JD parsing: required vs preferred
function extractJDRequirements(jdRaw){
  const jd = normalizeText(jdRaw);
  const lines = (jdRaw || "").split(/\n+/).map(l => l.trim()).filter(Boolean);

  const requiredLines = [];
  const preferredLines = [];
  const otherLines = [];

  for(const line of lines){
    const l = line.toLowerCase();

    if(l.includes("must have") || l.includes("required") || l.includes("mandatory")){
      requiredLines.push(line);
    } else if(l.includes("good to have") || l.includes("preferred") || l.includes("nice to have")){
      preferredLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  const reqText = normalizeText(requiredLines.join("\n"));
  const prefText = normalizeText(preferredLines.join("\n"));
  const allText = normalizeText(lines.join("\n"));

  const requiredSkills = extractFromDict(reqText || allText, SKILLS);
  const preferredSkills = extractFromDict(prefText, SKILLS);

  // Remove overlap: required dominates
  const prefFiltered = preferredSkills.filter(s => !requiredSkills.includes(s));

  // Experience requirement (simple)
  const exp = extractYearsRequirement(allText);

  // Education requirement (simple)
  const edu = extractFromDict(allText, EDU);

  return {
    requiredSkills,
    preferredSkills: prefFiltered,
    yearsRequired: exp,
    eduRequired: edu
  };
}

// --- Experience extraction
function extractYearsRequirement(text){
  // find patterns like: 2 years, 3+ years, 1-2 years
  const t = normalizeText(text);
  const re1 = /(\d+)\s*\+?\s*years?/g;
  let m, max = 0;
  while((m = re1.exec(t)) !== null){
    const n = parseInt(m[1], 10);
    if(!isNaN(n)) max = Math.max(max, n);
  }
  return max; // 0 means not specified
}

function extractResumeYears(text){
  const t = normalizeText(text);

  // Try to detect explicit years like "3 years"
  const direct = extractYearsRequirement(t);
  if(direct > 0) return direct;

  // Try date range like 2021 - 2023
  const re = /(19\d{2}|20\d{2})\s*(to|\-|–)\s*(present|19\d{2}|20\d{2})/gi;
  let total = 0;
  let m;
  const nowYear = new Date().getFullYear();

  while((m = re.exec(text)) !== null){
    const start = parseInt(m[1], 10);
    const endRaw = (m[3] || "").toLowerCase();
    const end = endRaw.includes("present") ? nowYear : parseInt(endRaw, 10);
    if(!isNaN(start) && !isNaN(end) && end >= start){
      total += (end - start);
    }
  }

  return Math.min(total, 20);
}

// --- Scoring
function getWeights(){
  const ws = parseInt(document.getElementById("wSkills").value, 10);
  const we = parseInt(document.getElementById("wExp").value, 10);
  const wd = parseInt(document.getElementById("wEdu").value, 10);
  const wc = parseInt(document.getElementById("wCert").value, 10);

  const sum = ws + we + wd + wc || 1;

  return {
    skills: ws / sum,
    exp: we / sum,
    edu: wd / sum,
    cert: wc / sum
  };
}

function scoreCandidate(jdReq, resumeRaw){
  const anon = document.getElementById("anonToggle").checked;
  const resumeText = anon ? anonymizeResume(resumeRaw) : (resumeRaw || "");

  const sections = splitSections(resumeText);
  const all = normalizeText(resumeText);

  // Skill extraction per section
  const sSkills = extractFromDict(normalizeText(sections["skills"] || ""), SKILLS);
  const sProjects = extractFromDict(normalizeText(sections["projects"] || ""), SKILLS);
  const sExp = extractFromDict(normalizeText(sections["experience"] || sections["work experience"] || ""), SKILLS);
  const sOther = extractFromDict(all, SKILLS);

  const allSkills = unique([...sSkills, ...sProjects, ...sExp, ...sOther]);

  // Weighted evidence score for skills
  const evidence = {};
  for(const sk of allSkills){
    evidence[sk] = 0;
    if(sSkills.includes(sk)) evidence[sk] += 1;
    if(sProjects.includes(sk)) evidence[sk] += 2;
    if(sExp.includes(sk)) evidence[sk] += 2;
    if(sOther.includes(sk)) evidence[sk] += 0.5;
  }

  // JD matching
  const req = jdReq.requiredSkills || [];
  const pref = jdReq.preferredSkills || [];

  const matchedReq = req.filter(s => allSkills.includes(s));
  const missingReq = req.filter(s => !allSkills.includes(s));
  const matchedPref = pref.filter(s => allSkills.includes(s));
  const missingPref = pref.filter(s => !allSkills.includes(s));

  // Skill score:
  // required: 75% of skill component
  // preferred: 25% of skill component
  const reqScore = req.length ? (matchedReq.length / req.length) : 1;
  const prefScore = pref.length ? (matchedPref.length / pref.length) : 1;

  const skillScore = (0.75 * reqScore) + (0.25 * prefScore);

  // Experience score
  const years = extractResumeYears(resumeText);
  let expScore = 1;
  if(jdReq.yearsRequired && jdReq.yearsRequired > 0){
    expScore = Math.min(years / jdReq.yearsRequired, 1);
  } else {
    // if not required, give small advantage to more years
    expScore = Math.min(years / 5, 1);
  }

  // Education score
  const eduFound = extractFromDict(all, EDU);
  const eduReq = jdReq.eduRequired || [];
  let eduScore = 1;
  if(eduReq.length){
    eduScore = eduReq.some(e => eduFound.includes(e)) ? 1 : 0.35;
  } else {
    eduScore = eduFound.length ? 1 : 0.6;
  }

  // Certification score
  const certFound = extractFromDict(all, CERTS);
  const certScore = certFound.length ? 1 : 0.65;

  const W = getWeights();
  const final = (
    W.skills * skillScore +
    W.exp * expScore +
    W.edu * eduScore +
    W.cert * certScore
  );

  // Evidence-based boost (small): more proof = slightly higher
  let proofBoost = 0;
  for(const s of matchedReq){
    proofBoost += (evidence[s] || 0);
  }
  proofBoost = Math.min(proofBoost / 20, 0.06); // max +6%

  const finalScore = Math.min(final + proofBoost, 1);

  // Breakdown for explainability
  const breakdown = {
    skills: skillScore,
    experience: expScore,
    education: eduScore,
    certifications: certScore,
    yearsDetected: years,
    proofBoost
  };

  return {
    finalScore,
    matchedReq,
    missingReq,
    matchedPref,
    missingPref,
    allSkills,
    eduFound,
    certFound,
    breakdown
  };
}

// --- UI helpers
function escapeHtml(str){
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function skillPills(list, miss=false){
  if(!list || !list.length) return "<span class='pill-skill'>None</span>";
  return list.map(s => {
    const cls = miss ? "pill-skill miss" : "pill-skill";
    return "<span class='" + cls + "'>" + escapeHtml(s) + "</span>";
  }).join("");
}

function pct(n){
  return Math.round(n * 100);
}

function addResumeItem(name="", text=""){
  const list = document.getElementById("resumeList");
  const id = "r_" + Math.random().toString(16).slice(2);

  const wrap = document.createElement("div");
  wrap.className = "resume-item";
  wrap.dataset.id = id;

  wrap.innerHTML = `
    <div class="resume-head">
      <div class="resume-name">Candidate</div>
      <div class="resume-actions">
        <button class="btn btn-ghost small" data-action="remove">Remove</button>
      </div>
    </div>

    <input class="input" placeholder="Candidate name (optional)" value="${escapeHtml(name)}" />
    <textarea placeholder="Paste resume text here...">${escapeHtml(text)}</textarea>
  `;

  wrap.querySelector('[data-action="remove"]').addEventListener("click", () => {
    wrap.remove();
    refreshCandidateLabels();
  });

  list.appendChild(wrap);
  refreshCandidateLabels();
}

function refreshCandidateLabels(){
  const items = document.querySelectorAll(".resume-item");
  items.forEach((item, idx) => {
    const label = item.querySelector(".resume-name");
    label.textContent = "Candidate " + (idx + 1);
  });
}

function getResumes(){
  const items = document.querySelectorAll(".resume-item");
  const resumes = [];

  items.forEach((item, idx) => {
    const name = item.querySelector("input").value.trim() || ("Candidate " + (idx + 1));
    const text = item.querySelector("textarea").value.trim();
    if(text.length >= 30){
      resumes.push({name, text});
    }
  });

  return resumes;
}

// --- Results rendering
function renderResults(results, jdReq){
  const area = document.getElementById("resultsArea");
  area.innerHTML = "";

  if(!results.length){
    area.innerHTML = `<div class="empty">No valid resumes found. Add at least 1 resume (30+ characters).</div>`;
    return;
  }

  results.forEach((r, i) => {
    const el = document.createElement("div");
    el.className = "result";

    const score = pct(r.finalScore);

    el.innerHTML = `
      <div class="result-top">
        <div>
          <div class="rank">#${i+1} • ${escapeHtml(r.name)}</div>
          <div class="breakdown">
            Detected experience: <b>${r.breakdown.yearsDetected} years</b> •
            Proof boost: <b>+${Math.round(r.breakdown.proofBoost * 100)}%</b>
          </div>
        </div>
        <div class="score">${score}%</div>
      </div>

      <div class="bar">
        <div class="fill" style="width:${score}%"></div>
      </div>

      <div class="cols">
        <div class="box">
          <h4>Matched Skills</h4>
          <div class="list">${skillPills([...r.matchedReq, ...r.matchedPref])}</div>
        </div>

        <div class="box">
          <h4>Missing Skills</h4>
          <div class="list">${skillPills([...r.missingReq, ...r.missingPref], true)}</div>
        </div>
      </div>

      <div class="box" style="margin-top:12px;">
        <h4>Score Breakdown</h4>
        <div class="breakdown">
          Skills match: <b>${pct(r.breakdown.skills)}%</b><br/>
          Experience match: <b>${pct(r.breakdown.experience)}%</b><br/>
          Education match: <b>${pct(r.breakdown.education)}%</b><br/>
          Certifications: <b>${pct(r.breakdown.certifications)}%</b><br/>
        </div>
      </div>
    `;

    area.appendChild(el);
  });
}

// --- Matching action
function runMatch(){
  const jdRaw = document.getElementById("jdText").value.trim();
  if(jdRaw.length < 30){
    alert("Please paste a Job Description (at least 30 characters).");
    return;
  }

  const resumes = getResumes();
  if(resumes.length < 1){
    alert("Please add at least 1 resume (30+ characters).");
    return;
  }

  const jdReq = extractJDRequirements(jdRaw);

  const scored = resumes.map(r => {
    const s = scoreCandidate(jdReq, r.text);
    return { ...s, name: r.name };
  });

  scored.sort((a,b) => b.finalScore - a.finalScore);

  window.__LAST_RESULTS__ = {scored, jdReq, jdRaw};
  renderResults(scored, jdReq);
}

// --- Download report (txt)
function downloadReport(){
  if(!window.__LAST_RESULTS__){
    alert("Run Match & Rank first.");
    return;
  }

  const {scored, jdReq} = window.__LAST_RESULTS__;

  let out = "";
  out += "SkillMatch Report\n";
  out += "================\n\n";

  out += "Job Requirements\n";
  out += "----------------\n";
  out += "Required Skills: " + (jdReq.requiredSkills.join(", ") || "None") + "\n";
  out += "Preferred Skills: " + (jdReq.preferredSkills.join(", ") || "None") + "\n";
  out += "Years Required: " + (jdReq.yearsRequired || 0) + "\n";
  out += "Education Keywords: " + (jdReq.eduRequired.join(", ") || "None") + "\n\n";

  out += "Ranked Candidates\n";
  out += "-----------------\n\n";

  scored.forEach((r, i) => {
    out += `#${i+1} ${r.name}\n`;
    out += `Fit Score: ${pct(r.finalScore)}%\n`;
    out += `Matched Skills: ${(r.matchedReq.concat(r.matchedPref)).join(", ") || "None"}\n`;
    out += `Missing Skills: ${(r.missingReq.concat(r.missingPref)).join(", ") || "None"}\n`;
    out += `Experience Detected: ${r.breakdown.yearsDetected} years\n`;
    out += `\n`;
  });

  const blob = new Blob([out], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "skillmatch_report.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- Weights UI
function bindWeight(id, outId){
  const el = document.getElementById(id);
  const out = document.getElementById(outId);
  const sync = () => out.textContent = el.value + "%";
  el.addEventListener("input", sync);
  sync();
}

// --- Example data
function loadExample(){
  document.getElementById("jdText").value =
`We are hiring a Frontend Developer.

Required Skills:
- JavaScript (ES6+)
- HTML, CSS
- React
- Git
- 2+ years experience

Preferred:
- Node.js
- REST APIs
- AWS
- MongoDB

Education: B.Tech / B.E preferred.`;

  // clear resumes
  document.getElementById("resumeList").innerHTML = "";

  addResumeItem("Aarav", 
`SKILLS
JavaScript, ReactJS, HTML5, CSS3, GitHub

PROJECTS
Built an ecommerce website using React and REST APIs.
Created UI dashboards with charts and tables.

EXPERIENCE
Frontend Developer Intern (2022 - 2024)
Worked on React components, API integration, and Git workflows.

EDUCATION
B.Tech in Computer Science`);

  addResumeItem("Diya", 
`SUMMARY
Web developer with strong HTML/CSS.

SKILLS
HTML, CSS, JavaScript, Git

PROJECTS
Portfolio website, landing pages.

EXPERIENCE
Freelance Web Developer (2023 - Present)

EDUCATION
B.Sc`);

  addResumeItem("Rohan", 
`SKILLS
JavaScript, React, Node.js, Express, MongoDB, Git, AWS

PROJECTS
Full stack app using React + Node.js + MongoDB.
Deployed on AWS.

EXPERIENCE
Software Engineer (2020 - Present)

EDUCATION
B.E`);

  alert("Example data loaded. Click Match & Rank.");
}

// --- init
document.getElementById("matchBtn").addEventListener("click", runMatch);
document.getElementById("addResumeBtn").addEventListener("click", () => addResumeItem());
document.getElementById("downloadBtn").addEventListener("click", downloadReport);
document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("loadExampleBtn").addEventListener("click", loadExample);

bindWeight("wSkills","wSkillsVal");
bindWeight("wExp","wExpVal");
bindWeight("wEdu","wEduVal");
bindWeight("wCert","wCertVal");

// Add 2 empty resumes by default
addResumeItem();
addResumeItem();
