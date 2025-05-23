# AI-WebGAL
基于WebGAL源码修改，支持AI对话、控制live2d、背景、bgm和场景切换
> 所使用的WebGAL引擎源码版本是4.5.12  

## 第三方代码声明

- 原项目：WebGAL by OpenWebGAL  
  许可证：Mozilla Public License 2.0  
  所使用源代码的链接：[[GitHub 链接]](https://github.com/OpenWebGAL/WebGAL)  
  修改：所有修改见 `modification.txt`  
  除了所提及的修改外，其余文件内容保持一致。  

# 配置概述
>此条目为概述，详细说明请参见"详细配置方法"

- 为了运行该项目，您需要进行以下配置：
1. 参考[[WebGAL官方开发文档]](https://docs.openwebgal.com/developers/#%E5%9C%A8%E6%9C%AC%E5%9C%B0%E5%90%AF%E5%8A%A8-webgal-%E9%A1%B9%E7%9B%AE)安装node_modules依赖
2. 获取一些live2d素材、背景图片、bgm。如果你在WebGAL的Mygo二创群内，你可以下载相应资源，并按照[[WebGAL资源管理文档]](https://docs.openwebgal.com/resources.html)将资源放在对应文件夹下。
3. 准备一个大语言模型的API
4. 完成`packages/webgal/public/game/AIconfig`下所有AI配置的编写
5. 参考[[WebGAL基本语法]](https://docs.openwebgal.com/webgal-script/base.html)完成`packages/webgal/public/game/scene`下场景文件的编写(当然，您可以只编写start.txt)

# 详细配置方法
## 安装依赖
> 参考：[[WebGAL官方开发文档]](https://docs.openwebgal.com/developers/#%E5%9C%A8%E6%9C%AC%E5%9C%B0%E5%90%AF%E5%8A%A8-webgal-%E9%A1%B9%E7%9B%AE)
### 步骤：
1. 自行搜索教程安装Node.js
2. 安装yarn
```
npm install yarn -g
```
3. 在项目根目录执行以下命令以安装依赖
```
yarn
```

## 素材放置
> 参考：[[WebGAL资源管理文档]](https://docs.openwebgal.com/resources.html)
- 如果您需要制作Mygo-Avemujica相关二创且已经获取到了相关资源，您可以将game文件夹内所有内容复制到本项目的game文件夹下
  - 示例：
    将`WebGal_Terre\assets\templates\Derivative_Engine\MYGO2.3\game`下所有内容复制到本项目`packages\webgal\public\game`文件夹下
- 关于live2d，你需要将整个模型的目录放入 `game\figure` 目录中，调用立绘的方法是调用立绘的 json 文件。

## API配置
> APIkey要写在哪里见下一节"AIconfig编写"  

请自行搜索大模型API获取教程
目前仅支持openrouter的API,在后续更新中会支持更多

## AIconfig编写
> 该配置较为重要。你的prompt将决定模型是否能按照固定格式输出说话人、LIVE2D动作和表情、背景图片、背景音乐、场景等。
您可以不修改我给出的样例（除了填入您自己的APIKey以外），这样也能取得不错的效果。但仍推荐您自己进行修改，毕竟我很多都是用ai写的。另外，即使不修改您也需要获取与配置文件相应的素材。

- 所有的AIconfig文件位于`packages\webgal\public\game\AIconfig`下
- AIconfig文件即所有的有关大语言模型输入输出的配置，包括global.json,controls.json,cardTable.json以及角色卡和世界/知识书。
- 您需要将您的所有角色卡和世界/知识书放在该目录下，您可以对它们随意命名，除了以下三个保留字不允许使用：global.json,controls.json和cardTable.json
> 以后会更新用来编辑这些配置文件的UI，现在如果嫌麻烦可以用ROOCODE让AI帮你写

### cardTable.json:
该文件中存放的是需要被程序读取的配置卡的名称。其中必须包含global和controls
- 当您新增配置卡并且需要使用时，您需要将其名称填入cardTable.json

### global.json:
参考已经给出的`packages\webgal\public\game\AIconfig\global.json`
- API_key: 你获取的APIkey写在这里
  > 当您向任何人分享您的global.json时，请删去您的API_key，避免以任何形式导致您的APIkey被公开

- user_name: 大模型将什么名称的说话人认为是用户。在通过API向大模型提交对话历史(backlog)的时候，程序区分一段话是用户输入还是模型或是系统输出，依靠的是这段话的说话人是否是user_name。

- context_item_length: 上下文数量。即向模型提交的历史中最多包含最近的多少次对话。请注意你输入一句AI回复一句算两次对话
- lore_search_length: 世界书搜索长度。即最近多少次对话会被纳入世界书搜索范围
- API_max_trying_limit: API回复最大重试次数。详见"常见问题"
- waiting_info: 等待AI回复时显示的信息。在backlog中显示，但不会成为向AI提交的对话历史的一部分。
- model: 模型名称
- format_prompt: 格式提示词。规范AI输出的格式方便程序提取并应用相应LIVE2D、背景、bgm等。需要与controls.json中规定的格式相对应。懒得写可以叫AI帮忙写。
- back_prompt: 全局后置提示词。详见"全部prompt提交顺序"
- front_prompt: 全局前置提示词。

### controls.json
参考已经给出的`packages\webgal\public\game\AIconfig\controls.json`
#### 基本匹配规则
- live2D_front_match和live2D_back_match: 
  - live2D提取标志。在格式提示词中，你需要让AI自己判断自己输出的内容应该使用什么人物的什么动作/表情的关键词，这部分输出应该具有特殊的格式，即被front_match和back_match包裹起来。当AI正确返回该格式的时候，程序会自动根据front_match和back_match提取其中内容并播放相应人物live2D.
  > 请注意这里的分割符也会被一起除去
- live2D_speaker_indicator: 在live2D_front_match和live2D_back_match包裹的区域内，切割说话人和动作表情关键词的符号
  - 例如：在格式提示词中要求: 请在每一句话后面添加\<\<\<人物:表情>>>。人物只能是xxx中的某一个，表情只能是xxx中的某一种。
  则当ai输出“你好\<\<\<丰川祥子:微笑>>>”的时候，程序会播放丰川祥子的关键词微笑(根据refer_table)所对应动作和表情。并在正文中删去格式区域。其中，丰川祥子和微笑被":"切割开来，":"就是live2D_speaker_indicator.
  > 请注意live2D_speaker_indicator是一个列表，可以写入多个你希望匹配的符号。但其他参数暂不支持多个符号。
- live2D_speaker_spliter: 多个live2D的切割符号。
  - 例如：当输出\<\<\<丰川祥子：微笑|千早爱音：思考>>>的时候，如果live2D_speaker_spliter是"|"，那么程序会自动把两人切割开来，同时在屏幕上显示两个人的live2D
  > 请注意live2D中所提及的角色并不一定会作为说话人，而只是会将其立绘显示在屏幕上。
- live2D_use_strict: 是否启用live2D严格匹配。
  - 例如：如果大模型输出\<\<\<丰川祥子：丰川祥子微笑>>>的时候，根据提取规则"丰川祥子微笑"会被作为live2D的动作/表情关键词，去提取相应的动作/表情。但假如实际上没有"丰川祥子微笑"这个关键词而只有"微笑"这个关键词的话，在严格模式下，会发生提取失败，而在非严格模式下，会被认为是提取"微笑"这个关键词对应的动作/表情。(即非严格模式是只要包含关键词就算这个关键词)
  - 一般设置为false，除非您有一个关键词是另一个关键词的子串
  > 关键词与动作/表情的对应关系应该被写在figure_table中的refer_table

- speaker_front_match和speaker_back_match: 说话人提取符
  > 这才是用来提取说话人的
- speaker_spliter: 多人同时说话的分割符
- 相似内容不再赘述......
- bgm_allow_repeat: 是否允许背景音乐立刻重复。
  - 即当大模型连续两句话给出相同的背景音乐的时候，是否需要重新开始播放音乐，一般设置为false。

#### 记忆区
- 由memory_front_match和memory_back_match包裹。你可以将你给模型规定的状态栏/长短期记忆等放在此处，它会在输出给用户的时候被除去，但作为历史返回给模型的时候会被保留。除此之外没有别的功能。

#### bg_table
- 参考样例即可。将希望模型输出的关键词和对应文件名分别写在key和value中

#### bgm_table
- 同上

#### scene_table
- scene_table是在大模型在对应格式区域输出关键词后用于切换对应场景的
- xxx.txt: 作为键的xxx.txt表示其后面的关键词-场景文件名键值对只在当前场景为xxx.txt的时候生效
- 例如："start.txt":{
            "祥子回家":"sakihome.txt",
            "祥子加班":"",
            "不变":""
          }
        表示如果当前场景是start.txt且模型在对应区域输出"祥子回家"，则切换到"sakihome.txt"。  
  > 值为空（即""）时表示不进行场景切换，当然，你也可以直接不写不进行切换的键值对

#### figure_table
- 整体上是列表，存储了各个角色live2D的控制信息  
- speaker: 角色名
- default_live2d_path: 该角色的默认live2D路径。
- refer_table: 以键值对形式存储，当大模型在指定格式区域输出某关键词的时候，会从其关键词对应的所有motion和expression组合中随机挑选一个播放。
  - 你可以为每一对motion和expression指明path，例如：
  - {
        "motion": "sakiko_thinking02",
        "expression": "sakiko_thinking01",
        "path": "sakiko/school_summer/model.json"
    },
  - 此时程序会使用该motion/expression特有的path
  - 如果不写path，则使用default_live2d_path
  > 请注意合法的motion和expression必须是该角色model.json中含有的

#### 段和句的配置
- 段：每一次模型给出的完整回复称为一段
- 句：一般而言，认为对应了唯一的说话人列表、live2D显示列表、背景图片、背景音乐、场景切换指令的为一句。
  - 例如模型输出：你好\<\<\<丰川祥子：微笑>>>\n我不好\<\<\<千早爱音：害怕>>>
  则会被认为是一段中有两句
- paragraph_spliter: 把段分成句的分割符，该分割符不会被除去
- 分句：有时一个句子也会太长导致对话框一次显示不下，此时会按照标点符号和长度切为分句
- sentence_spliter: 用于切为分句的标点列表
- close_punctuation: 闭合标点列表。如果一个标点后面就是闭合标点，那么会延后一个字符切。

#### live2D显示配置
- 当ai给出多个live2D要显示的时候，程序会自动安排它们的位置。
- screen_border_left和screen_border_right: 控制角色立绘的最左和最右允许位置
- standard_character_gap: 最大立绘间距
- position_change_factor: 控制增减立绘时角色位置的平移速度

### 完整样例：
- 假如模型回复:
  xxx,xxx！[长崎爽世]\<\<\<长崎爽世: 害怕|丰川祥子:无奈,月之森校门,真实的危机>>>\n xxxxxxxxxxxxxx。[丰川祥子]\<\<\<丰川祥子: 生气,月之森校门,真实的危机>>>
  并采用给出的controls.json样例
  则：
  - 模型将一段切分为两句
  - 以第一句为例,程序做以下操作：
    - 根据figure_table中的refer_table播放长崎爽世和丰川祥子的live2D
    - 切换背景为"G（月之森）/G1.png"
    - 切换bgm为"真实.mp3"
    - 在对话框显示相应对话。说话人是长崎爽世。如果句子过长则切成分句依次显示。
  > 实际上在bgm格式区内的文字是"长崎爽世: 害怕|丰川祥子:无奈,月之森校门,真实的危机"但因为不是严格模式，所以看这串字符串包括了什么，它包括了关键词真实的危机，因此播放"真实.mp3"。但如果你有另一首bgm的关键词是"月之森校门"，就不可以像这样安排格式了。

### 角色卡和世界书
- 采用sillytavern(酒馆)格式，可以在sillyTavern上编辑好以后直接导入
  > *仅支持了一部分参数
- 如果是自己编写，角色卡请参考`example/丰川祥子.json`；世界书请参考`example/mygo.json`
- 各参数含义请参考[[sillyTavern文档]](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)

## scene编写
参考已经给出的`packages\webgal\public\game\scene\start.txt`
- 您需要先阅读官方文档来了解WebGAL基本语法
- 以下是用于实现ai对话的较为重要的语法：
  - [[对话]](https://docs.openwebgal.com/webgal-script/dialogue.html)
  - [[场景与分支]](https://docs.openwebgal.com/webgal-script/scenes.html)
  - [[变量]](https://docs.openwebgal.com/webgal-script/variable.html)

### 本项目增补的用于ai对话的参数
>这些参数都是say（对话）语句下的参数
- -aichat:表示该对话的回复由ai生成
  >在-aichat没有添加时，aiexp,aibg,aibgm,aiscene,needpoint这些参数会被无视
- -aiexp:表示该对话的live2D由ai控制
- -aibg:表示该对话的背景图片由ai控制
- -aibgm:表示该对话的背景音乐由ai控制
- -needpoint:表示收到ai回复后是否需要再点一下才显示ai回复

### 作为样例的start.txt解析
- label与jumpLabel: 构成死循环，使你可以不停与ai对话
- getUserInput 该句获取用户输入并放在变量prompt中
- 你: {prompt}; 该句用于显示用户输入的话，其中说话人"你"需要与`global.json`的user_name保持一致
- ai: -aichat -aiexp -aibg -aibgm;该句发起API调用。其中说话人"ai"是显示`global.json`中waiting_info时的说话人
  你无需在该行再次添加{prompt}。因为它已经在上一句"你: {prompt};"中被添加并显示，因此已经加入了backlog，会被作为历史对话提交给ai
- 如果你执意在该行添加额外内容
  - 例如：
    ai: 请用中文回复 -aichat -aiexp -aibg -aibgm;
    则“请用中文回复”这个prompt不会显示，但会作为每次执行该行API对话时的后置词提交给ai

> 关于jumpLabel回跳在4.5.12 中有bug的问题，详见"常见问题"

# 全部prompt提交顺序
- 1. global_front_prompt: global.json中的front_prompt  
  提交者：system
- 2. format_prompt: global.json中的format_prompt  
  提交者：system
- 3. before_character_lore: 角色前世界书  
  提交者：以世界书要求的role为准
- 4. chara_content: 角色卡中的角色描述  
  提交者：system
- 5. after_character_lore: 角色后世界书  
  提交者：以世界书要求的role为准
- 6. history_content&lore_with_depth: 历史对话和带有深度的世界书  
  提交者：历史对话以说话人为准，世界书以世界书要求的role为准
  > 世界书的深度指示了其应该插入在历史对话的什么位置
- 7. back_prompt: 单次对话的后置词。见上文"作为样例的start.txt解析"中"如果你执意在该行添加额外内容"。  
  提交者：user
- 8. global_back_prompt:global.json中的back_prompt  
  提交者：user
# 常见问题
- Q: jumpLabel回跳在webgal 4.5.12 中有bug，而该项目是基于4.5.12改写的。  
  A: 该问题已经在webgal 4.5.13 中被官方修复，由于该项目的编写是基于4.5.12且jumpLabel是ai对话中关键的脚本语句，故本项目中该bug也是被修复了的。但由于我没有详细阅读过4.5.13的源码，不能保证修复方式和官方一致。
  > 由jumpLabel回跳引起的backlog显示问题也是被修复了的
  <br>
- Q: API_max_trying_limit的含义  
  A: 当API返回空的时候，重新发送API请求的最大次数  
  > API返回空可能是以下原因造成的
  - 如果您使用的是openrouter的API，那可能是因为您提交的prompt中在靠后的位置user占比太少导致的(不知道为什么会这样，但这是我大量实验得出的)。所有back_prompt被设置为user也是出于这个考虑。因此，请尽量不要让global.json中的back_prompt为空。
  - 如果您使用模型是gemini，那可能是因为谷歌截断了不合规的内容。考虑更换模型或者修改提示词。
  <br>  
- Q: Backlog回溯和存读档能否正常使用？  
- A: 能。  
  <br>  
- Q: 在等待AI回复的时候进行了读档操作会怎么样？  
- A: AI回复会被丢弃  
  <br>  
- Q: 是否只能用于Mygo&Avemujica？  
- A: 并非。大部分样例都是Mygo&Avemujica是因为我只有这些素材。
  <br>  
- Q: 如何查看AI完整回复和是否进行了live2D调用等信息？
- A: 浏览器F12查看控制台日志。本项目日志格式与webgal本身就有的日志格式保持相同。
  <br>  
- Q: 我需要在与AI对话2次后结束对话并进行别的演出
- A: 示例start.txt脚本如下:
  ```
  setVar: CX=2;
  label: label1;
  getUserInput: prompt -title=... -buttonText=sure;
  你: {prompt};
  ai: -aichat -aiexp -aibg -aibgm;
  setVar: CX=CX-1
  jumpLabel: label1 -when=CX>0;
  说话人: 别的演出;
  ```
  
# 其余问题正在debug中