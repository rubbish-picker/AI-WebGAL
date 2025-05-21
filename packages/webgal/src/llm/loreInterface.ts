export interface AILoreItem {
    uuid: string; // 唯一ID
    id: number; // ID
    constant: boolean; // 是否常驻
    content: string; // 内容
    depth: number; // 深度
    enabled: boolean; // 是否禁用
    keys: Array<string>; // 关键字
    order: number; // 排序
    position: number; // 位置
    excludeRecursion: boolean; // 是否排除递归
    preventRecursion: boolean; // 是否阻止递归
    role: string; // 角色：user/system/assistant
    source: string; // 来自哪张卡
}

export interface AICharacterItem {
    uuid: string; // 唯一ID
    id: string; // ID
    name: string; // 名称
    description: string; // 描述
    source: string; // 来自哪张卡
}