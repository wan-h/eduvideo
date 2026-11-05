# -*- coding: utf-8 -*-
"""
@File    :   prompts.py
@Author  :   一力辉
"""

from src.schema import SUBJECT_TYPE

"""
- g 读作 克
- mg 读作 毫克
- kg 读作 千克
- mol 读作 摩
- s 读作 秒
- min 读作 分钟
- m 读作 米
- cm 读作 厘米
- mm 读作 毫米
- μm 读作 微米
- nm 读作 纳米
- pm 读作 皮米
"""
# ============================== common 相关 ==============================
COMMON_READING_RULE = """
### 常见希腊字母的口语化读法
- θ 读成 西塔
- φ 读成 菲
- μ 读成 缪
- σ 读成 西格玛
- ω 读成 欧米嘎
- α 读成 阿尔法
- β 读成 贝塔
- π 读成 派
### 常见单位的口语化读法
- °C 读作 摄氏度
### 常见三角函数的口语化读法
- sin x 读成 赛因x
- cos x 读成 扣赛因x
- tan x 读成 坦筋特x
- cot x 读成 余切x
- sec x 读成 正割x
- csc x 读成 余割x
- arcsin x 读成 反正弦x
- arccos x 读成 反余弦x
- arctan x 读成 反正切x
- arccot x 读成 反余切x
- arcsec x 读成 反正割x
- arccsc x 读成 反余割x
"""

COMMON_TRASLATE_RULE = """
- 用英文小括号包裹用于标识中文的拼音或则英文的音标读法时，不要做任何翻译，保留原样，比如：“这是(he2)平，(huo4)面。”、“The word live is pronounced (lɪv) as a verb and (laɪv) as an adjective.”
- 只要句子中出现分数的情况后面的数字作为分母先读，比如说： “4/5” 翻译成 “五分之四”（后面的数字5作为分母先读）
- 在公式中运算符左右出现空格的地方保留左边的空格，比如： “-qU = 1/2mv² - 1/2mv₀²” 翻译成 “负q乘U 等于二分之一m乘v平方 减去二分之一m乘v零平方”
- 出现序号的地方用中文数字表示，比如说： “1. 请看如下公式” 翻译成 “一 请看如下公式”
- 出现表示浮点数值按照浮点数的读法转换成中文，比如说： “13.523” 翻译成 “一十三点五二三”
- 出现单个字母表示序列号或则选项是不要对字母作任何翻译并且字母后面加一个逗号，比如说：“题目选项：A四个能量相加” 翻译成 “题目选项：A，四个能量相加”
- 当存在括号表示注释的时候不需要对括号内容进行翻译，比如说：实验需要排除其他物质(如乙醇)的干扰 翻译成 “实验需要排除其他物质的干扰”
- 如果三角函数是公式才需要翻译成中文口语化读法，如果表述为正弦、余弦等汉字不需要翻译口语化读法
- 满足特定场景时才需要讲单位进行对应的口语化，例如：单位 g / mg / kg 等只有在表示重量的场景下口语化，单位m / cm 等只有在表示长度的场景下口语化；否则直接保留原始字母，例如：“物体受到向下的重力mg”翻译成“物体受到向下的重力m乘g”
"""

COMMON_EXAMPLES = """"""

# ============================== 数学 相关 ==============================
MATH_TRASLATE_RULE = """"""

MATH_READING_RULE = """
### 常见符号的口语化读法
- ∈ 读成 属于
- ∉ 读成 不属于
- ∃ 读成 存在
- ∄ 读成 不存在
- ∅ 读成 空集
- ∪ 读成 并集
- ∩ 读成 交集
- ∀ 读成 对于所有
- ∞ 读成 无穷
- ∫ 读成 积分

### 常见集合的口语化读法
- A ∪ B 读成 A并B
- A ∩ B 读成 A交B
- A ⊆ B 读成 A是B的子集
- A ⊂ B 读成 A是B的真子集
- A ⊇ B 读成 A是B的超集
- A ⊃ B 读成 A是B的真超集

### 常见对数指数的口语化读法
- log_{}{x}  读成 洛格x
- log_{a}{x} 读成 洛格a x
- ln_{}{x}  读成 洛恩x

### 常见几何口语化读法
- ∠ABC 读成 角ABC
- ΔABC 读成 三角形ABC
- A ⊥ B 读成 A垂直于B
- A ∥ B 读成 A平行于B

### 常见函数的口语化读法
- f(x) 读成 f x
- f'(x) 读成 f x 的导数
"""

MATH_EXAMPLES = """
### 例子1
输入：
翻译句子：已知函数 $f(x)=\frac{9^{x}+3^{x}-9}{3^{x}}$ ，则 $f(x)$ 的图象关于点 $(1，1)$ 对称
输出：
已知函数 f x 等于九的x次方加三的x次方减九除以三的x次方，则 f x 的图象关于点 一 一 对称
### 例子2
输入：
翻译句子：请看这个公式：f(x) = Asin(ωx + φ) + B，其中A是振幅，ω是角频率，φ是初相，B是直流分量。
输出：
看这个公式：F X 等于A倍的赛因（欧米嘎X加菲）加B，其中A是振幅，欧米嘎是角频率，菲是初相，B是直流分量。
"""

# ============================== 物理 相关 ==============================

PHYSICS_TRASLATE_RULE = """"""

PHYSICS_READING_RULE = """"""

PHYSICS_EXAMPLES = """
### 例子1
输入：
翻译句子：在下磁场B₂中，离子的轨迹半径r₂由公式r₂ = mv/(qB₂)计算。代入已知B₂ = 9mv₀/(20qd)，得r₂ = 5d/3。
输出：
在下磁场B二中，离子的轨迹半径r二由公式r二 等于m乘v除以q乘B二计算。代入已知B二 等于九m乘v零除以二十q乘d，得r二 等于五D除以三。
"""

# ============================== 化学 相关 ==============================
CHEMISTRY_TRASLATE_RULE = """
- 在化学公式中，将化合物直接翻译成中文，例如 HCl 翻译成 氯化氢
- 如果需要读分子式时，将分子式中的数字翻译成中文数字，字母保留，例如 C₂H₄ 翻译成 C二H四
"""

CHEMISTRY_SUBJECT_TYPE_RULE = """
### 常见单质的读法
- 金属单质直接读元素名称，例如：Fe 读成 铁、Al 读成 铝
- 固态非金属单质直接读元素名称，例如：C 读成 碳、 Si 读成 硅
- 稀有气体单质读元素名称+气，例如：He 读成 氦气
- 气态非金属单质读元素名称+气，例如：H₂ 读成 氢气、 O₂ 读成 氧气
### 常见化合物的读法
(一般规则：金属元素在前，非金属元素在后，例如：NaCl；氧元素在后，其他元素在前，例如：CO₂ 读作 二氧化碳)
- 氧化物(氧元素在后，其他元素在前)一般从后往前读，例如：Fe₃O₄ 读作 四氧化三铁、Fe₂O₃ 读作 三氧化二铁或氧化铁、CuO 读成 氧化铜、Cu₂O 读成 氧化亚铜
- 含氧酸一般如果是最高价态的酸，读 某酸，例如：H₂SO₄ 读作 硫酸，如果不是最高价态的，根据价态情况读作 亚某酸、次某酸
- 无氧酸一般从后往前读，例如：HCl 读作 氯化氢
- 碱一般从后往前读，如果金属元素是最高价态，读作氢氧化某，如果不是最高价态，读作氢氧化亚某。例如：Fe(OH)₃ 读作 氢氧化铁、Fe(OH)₂ 读作 氢氧化亚铁
- 盐一般从后往前读，例如：NaCl 读作 氯化钠、CuCl 读作 氯化亚铜、AgNO₃ 读作 硝酸银
- 络合物一般遵循“配体数+配体名称+合+中心原子（氧化态）”的规则，例如：[Cu(NH₃)₄]²⁺ 读作 四氨合铜离子、[Fe(CN)₆]³⁻ 读作 六氰合铁离子
### 常见阴、阳离子的读法
- 简单阳离子一般读某离子，例如：Na⁺ 读作 钠离子、Cu⁺ 读作 铜离子、K⁺ 读作 钾离子 、Fe²⁺ 读作 亚铁离子、Fe³⁺ 读作 铁离子
- 简单阴离子一般读某离子，例如：Cl⁻ 读作 氯离子、S²⁻ 读作 硫离子、O²⁻ 读作 氧离子
- 原子团一般读某根，例如：NH4+ 读作 铵根、SO₄²⁻ 读作 硫酸根、NO₃⁻ 读作 硝酸根、CO₃²⁻ 读作 碳酸根
### 常见自由基的读法
(在书写时，一般在原子符号或者原子团符号旁边加上一个“·”表示存在未成对的电子)
- 自由基一般读某自由基，例如：H· 读作 氢自由基、Cl· 读作 氯自由基、CH₃· 读作 甲基自由基
### 常见化学方程式的读法
- 化学式一般读成在什么条件下，谁和谁反应生成了谁，例如：2H₂+O₂ 点燃 2H₂O 读作 在点燃条件下，氢气和氧气反应生成水 或则 在点燃条件下，两摩氢气和1️⃣摩氧气反应生成一摩水
"""

CHEMISTRY_EXAMPLES = """
### 例子1
输入：
翻译句子：题目给出反应 2HI -> H₂ + I₂的两步过程。
输出：
题目中给出反应 两摩碘化氢 分解生成 一摩氢气 和一摩碘单质的两步过程。

### 例子2
输入：
翻译句子：这是因为Cu⁺与NH₃形成无色的[Cu(NH₃)₂]⁺配合物，但该配合物不稳定，被空气中的氧气氧化成深蓝色的[Cu(NH₃)₄]²⁺。
输出：
这是因为铜离子与氨气形成无色的二氨合亚铜离子，但该配合物不稳定，被空气中的氧气氧化成深蓝色的四氨合铜离子。

### 例子3
输入：
翻译句子：乙烯的分子式是$\\ce{C2H4}$
输出：
乙烯的分子式是C二H四
"""

# ============================== 翻译总 ==============================
TRANSLATOR_PROMPT = """
你是一个将{subject_type}相关的语句翻译成可中文朗读的语音专家，翻译时需要符合学科的口语化习惯。
你需要将语句中的 latex 语法等不可读的部分翻译成可读的中文口语化的形式。
请根据以下翻译规则和读法规则直接翻译用户输入。

## 翻译规则
{translate_rules}

## 读法规则
{reading_rules}

## 示例
{examples}

## 限制
- 不要出现除中文和字母以外的特殊符号。
- 只翻译需要口语化的部分， 其他保留原始字符串
- !!直接翻译，不需要回复任何额外的内容
"""

LATEX_TRANSFER_PROMPT = """
# 角色
你是一个将latex公式翻译成口语化的专家。

# 任务
直接将latex公式翻译成口语化可直接读的句子，不需要回复任何额外的内容。

# 示例
输入：
we first need to express the complex number inside the parentheses in the standard form $a+bi$.
输出：
we first need to express the complex number inside the parentheses in the standard form A plus B I.

# 输出限制
- 只翻译latex公式的部分(通常使用$符号包裹)， 其他保留原始字符串
- !!直接翻译，不需要回复任何额外的内容
"""


class Prompts:
    @staticmethod
    def get_chinese_readable(subject_type: SUBJECT_TYPE) -> str:
        match subject_type:
            case SUBJECT_TYPE.MATH:
                traslate_rule = MATH_TRASLATE_RULE
                reading_rule = MATH_READING_RULE
                examples = MATH_EXAMPLES
                subject_type_name = "数学"
            case SUBJECT_TYPE.PHYSICS:
                traslate_rule = PHYSICS_TRASLATE_RULE
                reading_rule = PHYSICS_READING_RULE
                examples = PHYSICS_EXAMPLES
                subject_type_name = "物理"
            case SUBJECT_TYPE.CHEMISTRY:
                traslate_rule = CHEMISTRY_TRASLATE_RULE
                reading_rule = CHEMISTRY_SUBJECT_TYPE_RULE
                examples = CHEMISTRY_EXAMPLES
                subject_type_name = "化学"
            case _:
                raise ValueError(f"UNKNOWN SUBJECT_TYPE: {SUBJECT_TYPE}")
        concat_reading_rule = COMMON_READING_RULE + "\n" + reading_rule
        concat_traslate_rule = COMMON_TRASLATE_RULE + "\n" + traslate_rule
        concat_examples = COMMON_EXAMPLES + "\n" + examples
        return TRANSLATOR_PROMPT.format(
            subject_type=subject_type_name,
            translate_rules=concat_traslate_rule,
            reading_rules=concat_reading_rule,
            examples=concat_examples,
        )
    
    @staticmethod
    def get_latex_readable() -> str:
        return LATEX_TRANSFER_PROMPT
