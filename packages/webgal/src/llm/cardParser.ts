import { AICharacterItem, AILoreItem } from "./loreInterface";
import { characterTable } from "./AICharacter";
import { generateUUID } from "./utils";
import { backgroundTable } from "./AIBackground";
import { bgmTable } from "./AIMusic";
import { sceneChangeTable } from "./AIScene";
import { aiConfig } from "./AIConfig";
import { logger } from "@/Core/util/logger";

export class ParsedCardManager {

    public lorebooks: Array<AILoreItem> = []; // 存储 Lore 信息的数组
    public characters: Array<AICharacterItem> = []; // 存储角色信息的数组
    public parseAndAdd(name: string, raw_content: any): void {
        if (!raw_content) {
            logger.error("Empty card:" + name + "!");
            return; // 如果原始内容为空，则返回
        }
        if (name == "global") {
            aiConfig.addGlobalConfig(raw_content);
            logger.debug("card_parse finish:" + name); // 输出解析完成的信息
            return; // 返回
        }
        else if (name == "controls") {
            aiConfig.addControlConfig(raw_content);
            characterTable.initial(raw_content);
            backgroundTable.initial(raw_content);
            bgmTable.initial(raw_content);
            sceneChangeTable.initial(raw_content);
            logger.debug("card_parse finish:" + name); // 输出解析完成的信息
            return;
        }
        let IsWorldBook = true; // 是否为世界书
        if (raw_content.data != undefined) IsWorldBook = false; // 如果原始内容中有 data 属性，则不是世界书
        if (IsWorldBook) {
            for (const entry of Object.values(raw_content.entries)) {
                this.addMonoLore(name, entry); // 遍历并添加 Lore 信息
            }
            logger.debug("Lore added,now lore books:",this.lorebooks)
        }
        else {
            this.addMonoCharacter(name, raw_content.data); // 添加角色信息
            if (raw_content.data.character_book && raw_content.data.character_book.entries) {
                for (const entry of raw_content.data.character_book.entries) {
                    this.addMonoLore(name, entry); // 遍历并添加角色书
                }
                logger.debug("Character Lore added,now lore books:",this.lorebooks)
            }
        }
        logger.debug("card_parse finish:" + name); // 输出解析完成的信息
    }
    private addMonoLore(source: string, mono_content: any) {
        let newLoreItem: AILoreItem = {
            uuid: generateUUID(), // 生成唯一 ID
            id: mono_content.id ?? 0, // 卡片名称
            constant: mono_content.constant ?? false, // 是否常驻
            content: mono_content.content, // 内容
            depth: mono_content.depth ?? mono_content.extensions.depth ?? 4, // 深度 当前对话之前4轮的位置
            enabled: mono_content.enabled ?? !mono_content.disable ?? true, // 是否启用
            keys: mono_content.keys ?? mono_content.key, // 关键字
            order: mono_content.order ?? 10, // 排序
            position: mono_content.position ?? 4, // 位置 默认是当前对话位置
            excludeRecursion: mono_content.excludeRecursion ?? false, // 是否排除递归
            preventRecursion: mono_content.preventRecursion ?? false, // 是否阻止递归
            role: "system", // 角色：user/system/assistant
            source: source, // 来自哪张卡
        }
        switch (mono_content.role) {
            case null:
                newLoreItem.role = "system";
                break;
            case 0:
                newLoreItem.role = "system";
                break;
            case 1:
                newLoreItem.role = "user";
                break;
            case 2:
                newLoreItem.role = "assistant";
                break;
            default:
                newLoreItem.role = "system";
                logger.warn("unsupported loreitem role! falling back to default");
                break;
        }
        if (!isNaN(parseInt(mono_content.position))) {
            if (![0, 1, 4].includes(mono_content.position)) {
                newLoreItem.position = 4;
                logger.warn("unsupported loreitem position! falling back to default");
            }
            else {
                newLoreItem.position = mono_content.position;
            }
        }
        else { // 如果角色是字符串，则根据字符串的值进行赋值
            switch (mono_content.position) {
                case "after_char":
                    newLoreItem.position = 1; // 角色定义后
                    break;
                case "before_char":
                    newLoreItem.position = 0; // 角色定义前
                    break;
                default:
                    logger.warn("unsupported loreitem position! falling back to default");
                    newLoreItem.position = 4; // 默认 默认是D
                    break;
            }
        }
        if (newLoreItem.keys == undefined || newLoreItem.content == undefined) {
            logger.warn("LoreItem 解析失败，键值对可能为空", mono_content); // 如果解析失败，则输出警告信息
            return; // 如果关键字、内容、名称 未定义，则返回
        }
        this.lorebooks.push(newLoreItem); // 将解析后的 Lore 信息添加到 lorebooks 数组中
    }

    private addMonoCharacter(source: string, mono_content: any) {
        let newCharacterItem: AICharacterItem = {
            uuid: generateUUID(), // 生成唯一 ID
            id: mono_content.id ?? mono_content.extensions.id ?? 0, // 卡片名称
            name: mono_content.name, // 卡片名称
            description: mono_content.description, // 描述
            source: source, // 来自哪张卡
        }
        if (newCharacterItem.name == undefined || newCharacterItem.description == undefined) {
            logger.warn("CharacterItem 解析失败，键值对可能为空", mono_content); // 如果解析失败，则输出警告信息
            return; // 如果名称、描述未定义，则返回
        }
        this.characters.push(newCharacterItem); // 将解析后的角色信息添加到 characters 数组中
        logger.debug("Character added,now character descriptions:",this.characters);
    }
}

export const parsedCardManager = new ParsedCardManager(); // 创建一个 ParsedCardManager 实例