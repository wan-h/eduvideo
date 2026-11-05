export interface EquationTemplate {
  name: string
  formula: string
}

export interface EquationCategory {
  category: string
  formulas: EquationTemplate[]
}

export interface EquationGroup {
  name: string
  icon: "sigma" | "flask" | "zap"
  categories: EquationCategory[]
}

export const equationGroups: EquationGroup[] = [
  {
    name: "数学",
    icon: "sigma",
    categories: [
      {
        category: "基础代数",
        formulas: [
          {
            name: "一元二次方程求根公式",
            formula: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
          },
          { name: "平方差公式", formula: "a^2 - b^2 = (a + b)(a - b)" },
          {
            name: "完全平方公式",
            formula: "(a \\pm b)^2 = a^2 \\pm 2ab + b^2",
          },
          {
            name: "立方和公式",
            formula: "a^3 + b^3 = (a + b)(a^2 - ab + b^2)",
          },
        ],
      },
      {
        category: "函数",
        formulas: [
          { name: "一次函数", formula: "y = kx + b \\quad (k \\neq 0)" },
          { name: "二次函数", formula: "y = ax^2 + bx + c \\quad (a \\neq 0)" },
          {
            name: "反比例函数",
            formula: "y = \\frac{k}{x} \\quad (k \\neq 0)",
          },
          { name: "指数函数", formula: "y = a^x \\quad (a > 0, a \\neq 1)" },
          {
            name: "对数函数",
            formula: "y = \\log_a x \\quad (a > 0, a \\neq 1)",
          },
        ],
      },
      {
        category: "三角函数",
        formulas: [
          { name: "平方关系", formula: "\\sin^2\\theta + \\cos^2\\theta = 1" },
          {
            name: "商数关系",
            formula: "\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}",
          },
          {
            name: "和角公式",
            formula:
              "\\sin(\\alpha \\pm \\beta) = \\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta",
          },
          {
            name: "二倍角公式",
            formula: "\\sin 2\\theta = 2\\sin\\theta\\cos\\theta",
          },
          { name: "余弦定理", formula: "c^2 = a^2 + b^2 - 2ab\\cos C" },
        ],
      },
      {
        category: "数列",
        formulas: [
          { name: "等差数列通项", formula: "a_n = a_1 + (n - 1)d" },
          { name: "等差数列求和", formula: "S_n = \\frac{n(a_1 + a_n)}{2}" },
          { name: "等比数列通项", formula: "a_n = a_1 q^{n-1}" },
          {
            name: "等比数列求和",
            formula: "S_n = \\frac{a_1(1 - q^n)}{1 - q} \\quad (q \\neq 1)",
          },
        ],
      },
      {
        category: "立体几何",
        formulas: [
          { name: "球的体积", formula: "V = \\frac{4}{3}\\pi r^3" },
          { name: "球的表面积", formula: "S = 4\\pi r^2" },
          { name: "圆锥体积", formula: "V = \\frac{1}{3}\\pi r^2 h" },
          { name: "圆柱体积", formula: "V = \\pi r^2 h" },
        ],
      },
      {
        category: "概率统计",
        formulas: [
          {
            name: "加法公式",
            formula: "P(A \\cup B) = P(A) + P(B) - P(A \\cap B)",
          },
          { name: "条件概率", formula: "P(A|B) = \\frac{P(A \\cap B)}{P(B)}" },
          { name: "期望值", formula: "E(X) = \\sum_{i=1}^{n} x_i p_i" },
        ],
      },
    ],
  },
  {
    name: "化学",
    icon: "flask",
    categories: [
      {
        category: "基础方程式",
        formulas: [
          { name: "氢气燃烧", formula: "\\ce{2H2 + O2 -> 2H2O}" },
          { name: "铁锈形成", formula: "\\ce{4Fe + 3O2 -> 2Fe2O3}" },
          {
            name: "碳酸钙分解",
            formula: "\\ce{CaCO3 ->[\\Delta] CaO + CO2 ^}",
          },
        ],
      },
      {
        category: "酸碱反应",
        formulas: [
          { name: "酸碱中和", formula: "\\ce{H+ + OH- -> H2O}" },
          { name: "盐酸与氢氧化钠", formula: "\\ce{HCl + NaOH -> NaCl + H2O}" },
          {
            name: "硫酸与氢氧化钠",
            formula: "\\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}",
          },
        ],
      },
      {
        category: "氧化还原",
        formulas: [
          { name: "铁与硫酸铜", formula: "\\ce{Fe + CuSO4 -> FeSO4 + Cu}" },
          { name: "锌与盐酸", formula: "\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}" },
          {
            name: "铜与硝酸银",
            formula: "\\ce{Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag}",
          },
        ],
      },
      {
        category: "离子方程式",
        formulas: [
          { name: "氢氧化铁沉淀", formula: "\\ce{Fe^3+ + 3OH- -> Fe(OH)3 v}" },
          { name: "碳酸钡沉淀", formula: "\\ce{Ba^2+ + CO3^2- -> BaCO3 v}" },
          { name: "氯化银沉淀", formula: "\\ce{Ag+ + Cl- -> AgCl v}" },
        ],
      },
    ],
  },
  {
    name: "物理",
    icon: "zap",
    categories: [
      {
        category: "力学",
        formulas: [
          { name: "牛顿第二定律", formula: "F = ma" },
          { name: "万有引力定律", formula: "F = G\\frac{m_1 m_2}{r^2}" },
          { name: "动能", formula: "E_k = \\frac{1}{2}mv^2" },
          { name: "重力势能", formula: "E_p = mgh" },
          { name: "功", formula: "W = Fs\\cos\\theta" },
          { name: "功率", formula: "P = \\frac{W}{t} = Fv" },
          { name: "动量", formula: "p = mv" },
        ],
      },
      {
        category: "电磁学",
        formulas: [
          { name: "库仑定律", formula: "F = k\\frac{q_1 q_2}{r^2}" },
          { name: "欧姆定律", formula: "I = \\frac{U}{R}" },
          { name: "电功率", formula: "P = UI = I^2R" },
          { name: "电场强度", formula: "E = \\frac{F}{q}" },
        ],
      },
      {
        category: "热学",
        formulas: [
          { name: "热量计算", formula: "Q = cm\\Delta t" },
          { name: "理想气体方程", formula: "pV = nRT" },
          { name: "热力学第一定律", formula: "\\Delta U = Q - W" },
        ],
      },
      {
        category: "光学",
        formulas: [
          { name: "折射率", formula: "n = \\frac{c}{v}" },
          {
            name: "斯涅尔定律",
            formula: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2",
          },
          {
            name: "透镜成像公式",
            formula: "\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}",
          },
        ],
      },
      {
        category: "原子物理",
        formulas: [
          { name: "质能方程", formula: "E = mc^2" },
          { name: "光子能量", formula: "E = hf" },
          { name: "德布罗意波长", formula: "\\lambda = \\frac{h}{p}" },
        ],
      },
    ],
  },
]
