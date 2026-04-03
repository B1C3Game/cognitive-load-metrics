# Partner Artifacts Index

## Quick Navigation

### Strategy Documents
- **THREE-PERSONA-STRATEGY.md** — Master guide: which narrative goes with which buyer, how to sequence pitches
- **VALIDATION-NARRATIVE.md** — Quality gate positioning (quality officers, compliance boards)
- **IMPROVEMENT-NARRATIVE.md** — Content ROI positioning (content teams, publishers)
- **AUDIT-NARRATIVE.md** — Accessibility/compliance positioning (accessibility officers, legal)

### Evidence Artifacts

#### Realistic Profile (Validation Use Case)
- `realistic/evaluation_report.json` — 8 pairs, 3.75 avg delta, structured failure data
- `realistic/evaluation_report.csv` — CSV table: file | clean_score | noisy_score | score_delta | clean_failed | noisy_failed
- `realistic/demo_story.txt` — Top 3 examples with before/after and rewrite suggestions

#### Improvement Profile (Improvement Use Case)
- `improvement/evaluation_report.json` — 8 pairs, 1.75 avg delta, code-switching-focused
- `improvement/evaluation_report.csv` — Same format, emphasizes code-switching vulnerability (0.1713 factor delta)
- `improvement/demo_story.txt` — Top 3 examples highlighting actionable bottlenecks

#### Aggressive Profile (Escalation/Stress Test)
- `aggressive/evaluation_report.json` — 8 pairs, 2.62 avg delta, maximum perturbations
- `aggressive/evaluation_report.csv` — Used if partner asks "what's worst case?"
- `aggressive/demo_story.txt` — Worst-case examples showing dimension failures

### Technical Foundation
- `../docs/SCORER_PSEUDOCODE.md` — Algorithm documentation for audit/compliance teams
- `../schema/scorer_output.schema.json` — JSON contract for scorer output (auditable, machine-readable)

## How to Use in Pitches

### For Quality/Governance Teams
📊 Start with: VALIDATION-NARRATIVE.md  
📎 Attach: realistic/evaluation_report.csv + realistic/demo_story.txt  
🎯 Close with: THREE-PERSONA-STRATEGY.md (show them you support all three use cases)

### For Content Teams
📊 Start with: IMPROVEMENT-NARRATIVE.md  
📎 Attach: improvement/evaluation_report.json (highlight code-switching factor delta) + improvement/demo_story.txt  
💡 Bonus: Show them the realistic CSV too (proof it's generalizable)

### For Accessibility/Compliance  
📊 Start with: AUDIT-NARRATIVE.md  
📎 Attach: realistic/evaluation_report.json + SCORER_PSEUDOCODE.md + schema/scorer_output.schema.json  
✅ Include: Failure escalation proof (realistic 0.75→1.12)

---

## Pitch Template

**Slide 1:** [Buyer pain point from their narrative]  
**Slide 2:** Our five-dimension model (from PSEUDOCODE.md diagram)  
**Slide 3:** [Your narrative]  
**Slide 4:** One real example from demo_story.txt  
**Slide 5:** Data proof (one CSV row or JSON snippet)  
**Slide 6:** CTA  

---

## File Manifest for Delivery

```
outputs/
├── VALIDATION-NARRATIVE.md          ← Validation positioning
├── IMPROVEMENT-NARRATIVE.md         ← Improvement ROI positioning
├── AUDIT-NARRATIVE.md               ← Compliance positioning
├── THREE-PERSONA-STRATEGY.md        ← Master strategy guide
├── ARTIFACTS-INDEX.md               ← This file
├── realistic/
│   ├── evaluation_report.json       ← Validation evidence
│   ├── evaluation_report.csv        
│   └── demo_story.txt
├── improvement/
│   ├── evaluation_report.json       ← Improvement evidence
│   ├── evaluation_report.csv
│   └── demo_story.txt
└── aggressive/
    ├── evaluation_report.json       ← Stress test evidence
    ├── evaluation_report.csv
    └── demo_story.txt
```

---

## Key Metrics to Quote in Calls

**Validation**: "3.75-point delta proves our gate works"  
**Improvement**: "Code-switching is 0.1713 factor delta—your biggest fix opportunity"  
**Audit**: "Dimension tracking lets you prove compliance—4/8 docs have code-switching failures"

---

**Status**: Ready to ship  
**Last Updated**: After three-profile pipeline (realistic, improvement, aggressive)  
**Quality Check**: All narratives have evidence backing, positioned to distinct buyer pain points
