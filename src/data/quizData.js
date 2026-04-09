export const quizData = {
  jeeMains: [
    { q: "SI unit of electric field intensity?", options: ["N/C", "V/m", "Both a & b", "J/C"], answer: 2, explanation: "Both N/C and V/m are equivalent units of electric field." },
    { q: "Work done by conservative force in closed loop?", options: ["Maximum", "Zero", "Negative", "Path dependent"], answer: 1, explanation: "Conservative forces are path-independent, so net work in a loop = 0." },
    { q: "Acceleration due to gravity at Earth's center?", options: ["9.8 m/s²", "4.9 m/s²", "Zero", "Infinity"], answer: 2, explanation: "At the center, g = 0 because equal mass pulls from all sides." },
    { q: "Derivative of sin(x)?", options: ["-cos(x)", "cos(x)", "tan(x)", "sec²(x)"], answer: 1, explanation: "d/dx(sin x) = cos x. Standard derivative." },
    { q: "Molarity is defined as?", options: ["Moles/kg solvent", "Moles/litre solution", "Mass/litre", "Moles of solvent/litre"], answer: 1, explanation: "Molarity = moles of solute per litre of solution." },
    { q: "Which law relates gas pressure and volume at constant temperature?", options: ["Charles' Law", "Boyle's Law", "Avogadro's Law", "Gay-Lussac's Law"], answer: 1, explanation: "Boyle's Law: PV = constant at constant T." },
    { q: "Integration of 1/x is?", options: ["x", "ln|x|", "1/x²", "x²/2"], answer: 1, explanation: "∫(1/x)dx = ln|x| + C" },
    { q: "Newton's 2nd law in vector form?", options: ["F=mv", "F=ma", "F=m/a", "F=v/t"], answer: 1, explanation: "Force equals mass times acceleration: F⃗ = ma⃗" },
    { q: "Atomic number of Carbon?", options: ["4", "6", "8", "12"], answer: 1, explanation: "Carbon has 6 protons, so atomic number = 6." },
    { q: "The value of sin(90°)?", options: ["0", "0.5", "√2/2", "1"], answer: 3, explanation: "sin(90°) = 1. Standard trigonometric value." },
  ],
  jeeAdvanced: [
    { q: "Wave function ψ = √(2/L)sin(nπx/L), probability density at x=L/2 for n=1?", options: ["2/L", "1/L", "L/2", "Zero"], answer: 0, explanation: "|ψ|² = (2/L)sin²(π/2) = 2/L" },
    { q: "Magnetic flux SI unit?", options: ["Tesla", "Weber", "Henry", "Farad"], answer: 1, explanation: "Weber (Wb) is the SI unit of magnetic flux." },
    { q: "Photoelectric effect: light energy is?", options: ["Continuous", "Quantized", "Variable", "Fixed"], answer: 1, explanation: "Einstein proved photons are discrete energy packets E=hf." },
    { q: "For adiabatic process, dQ =?", options: ["dW", "0", "dU", "dU+dW"], answer: 1, explanation: "No heat exchange in adiabatic process." },
    { q: "Entropy change in reversible process?", options: ["Increases", "Decreases", "Unchanged", "Undefined"], answer: 2, explanation: "ΔS=0 for reversible processes in isolated system." },
    { q: "de Broglie wavelength λ =?", options: ["h/mv", "mv/h", "hv/m", "mh/v"], answer: 0, explanation: "λ = h/p = h/mv" },
    { q: "Moment of inertia of solid sphere?", options: ["2/5 MR²", "2/3 MR²", "MR²", "1/2 MR²"], answer: 0, explanation: "I = (2/5)MR² for solid sphere." },
    { q: "Cross product A×B is?", options: ["Scalar", "Vector ⊥ both", "Vector parallel", "Zero"], answer: 1, explanation: "Cross product gives vector perpendicular to both input vectors." },
    { q: "Gibbs free energy at equilibrium?", options: ["Maximum", "Minimum", "Zero", "Negative"], answer: 1, explanation: "System at equilibrium has minimum Gibbs free energy." },
    { q: "Effective nuclear charge Zeff means?", options: ["Total protons", "Net charge felt by e⁻", "Neutron count", "Atomic mass"], answer: 1, explanation: "Zeff = Z - shielding constant." },
  ],
  neet: [
    { q: "Powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"], answer: 2, explanation: "Mitochondria produces ATP energy for the cell." },
    { q: "DNA replication occurs in which phase?", options: ["G1", "S phase", "G2", "M phase"], answer: 1, explanation: "DNA synthesis/replication happens during S (Synthesis) phase." },
    { q: "Universal blood donor group?", options: ["A", "B", "AB", "O"], answer: 3, explanation: "O negative is universal donor as it has no antigens." },
    { q: "Which enzyme is used in PCR?", options: ["DNA Ligase", "RNA Polymerase", "Taq Polymerase", "Helicase"], answer: 2, explanation: "Taq Polymerase is heat-stable, perfect for PCR thermocycling." },
    { q: "Site of protein synthesis?", options: ["Nucleus", "Ribosome", "Mitochondria", "ER"], answer: 1, explanation: "Ribosomes are the site of protein synthesis (translation)." },
    { q: "Insulin is secreted by?", options: ["Liver", "Pancreas (Beta cells)", "Thyroid", "Adrenal gland"], answer: 1, explanation: "Beta cells of Islets of Langerhans in pancreas secrete insulin." },
    { q: "Which vitamin is produced by sunlight?", options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], answer: 3, explanation: "Vitamin D is synthesized in skin on UV light exposure." },
    { q: "Which organ filters blood?", options: ["Liver", "Lung", "Kidney", "Heart"], answer: 2, explanation: "Kidneys filter blood and produce urine." },
    { q: "Formula of Glucose?", options: ["C₆H₁₂O₆", "C₁₂H₂₂O₁₁", "CH₄", "C₂H₅OH"], answer: 0, explanation: "Glucose molecular formula is C₆H₁₂O₆." },
    { q: "The fluid mosaic model describes?", options: ["DNA structure", "Cell membrane", "Mitosis", "Ribosome"], answer: 1, explanation: "Singer and Nicolson's fluid mosaic model describes cell membrane structure." },
  ],
}

export const getQuizBySubject = (subject) => {
  switch (subject) {
    case 'jee-mains': return quizData.jeeMains
    case 'jee-advanced': return quizData.jeeAdvanced
    case 'neet': return quizData.neet
    default: return quizData.jeeMains
  }
}

export const subjectLabels = {
  'jee-mains': 'JEE Mains',
  'jee-advanced': 'JEE Advanced',
  'neet': 'NEET',
}
