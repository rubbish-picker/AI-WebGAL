import { logger } from "@/Core/util/logger";
import { GeneralKeyValueInterface } from "./utils";

/**
 * AI场景切换配置管理类
 * 管理多场景切换规则的键值对配置
 */
export class AISceneChangeTable {
    /**
     * 存储场景切换配置的数组
     * 每个元素包含当前场景和对应的切换条件集合
     */
    public sceneChanges: MonoAISceneChangeTable[] = [];

    /**
     * 初始化场景切换配置表
     * @param raw_content - 原始配置对象，需要包含scene_table数组字段
     * 配置示例：
     * "scene_table": [
     *   {"当前场景A": {"触发词1": "目标场景文件A", "触发词2": "目标场景文件B"}},
     *   {"当前场景B": {"触发词3": "目标场景文件C"}}
     * ]
     */
    public initial(raw_content: any) {
        if (!raw_content.scene_table) {
            logger.warn("Missing scene_table in controls.json");
            return;
        }
        for (let sceneChange of raw_content.scene_table) {
            this.addMonoSceneChange(sceneChange);
        }
    }

    /**
     * 添加单个场景切换配置项
     * @param jsonText - 单个场景配置对象（单键值对结构）
     */
    public addMonoSceneChange(jsonText: any) {
        if (Object.keys(jsonText).length == 0) {
            logger.warn("Empty key-value pair of nowScene,please check controls.json.");
            return;
        }
        const key = Object.keys(jsonText)[0];
        const value = jsonText[key];
        let changeTriggers: GeneralKeyValueInterface[] = [];
        for (let triggerKey of Object.keys(value)) {
            let mono: GeneralKeyValueInterface = {
                key: triggerKey,
                value: value[triggerKey],
            }
            changeTriggers.push(mono);
        }
        this.sceneChanges.push({ nowScene: key, changeTriggers: changeTriggers });
        logger.info("Scene AIConfig Added", { nowScene: key, changeTriggers: changeTriggers });
    }

    /**
    * 获取场景切换路径
    * @param nowScene - 当前场景名称 
    * @param targetKey - 场景切换触发词
    * @param strict - 匹配模式
    *                true: 精确匹配场景名和触发词
    *                false: 包含匹配（默认）
    * @returns 目标场景路径 | null
    * 
    * 匹配流程：
    * 1. 查找匹配当前场景的配置项
    * 2. 在匹配项的触发器中查找目标触发词
    * 3. 返回首个有效匹配值
    */
    public getSceneChange(nowScene: string, targetKey: string, strict: boolean = false) {
        for (let scene of this.sceneChanges) {
            let flag = false;
            if (!strict) {
                if (nowScene.includes(scene.nowScene)) flag = true;
            }
            else {
                if (nowScene == scene.nowScene) flag = true;
            }
            if (flag) {
                for (let trigger of scene.changeTriggers) {
                    if (strict) {
                        if (trigger.key == targetKey && trigger.value != "") {
                            // logger.debug("Target scene got",targetKey);
                            return trigger.value;
                        }
                    }
                    else {
                        if (targetKey.includes(trigger.key) && trigger.value != "") {
                            // logger.debug("Target scene got",targetKey);
                            return trigger.value;
                        }
                    }
                }
                logger.warn("Unable to find target SceneKey or value is empty", targetKey);
                return null;
            }
        }
        logger.warn("Unable to find nowScene in scene_table in controls.json", nowScene);
        return null;
    }
}

/**
 * 单个场景切换配置接口
 */
export interface MonoAISceneChangeTable {
    nowScene: string // 当前场景标识
    changeTriggers: GeneralKeyValueInterface[] // 切换条件集合（触发词 -> 目标场景）
}

/**
 * 全局场景切换表单例实例
 */
export const sceneChangeTable = new AISceneChangeTable();