export class CardManager {
    private cards: Map<string, string> = new Map(); // 存储卡片信息的 Map
    public addCard(cardName: string, cardContent: string) {
        this.cards.set(cardName, cardContent); // 添加卡片信息到 Map
    }
    public getCard(cardName: string): string | undefined {
        return this.cards.get(cardName); // 获取指定卡片的信息
    }
    public getAllCards(): Map<string, string> {
        return this.cards; // 获取所有卡片的信息
    }
    public removeCard(cardName: string) {
        this.cards.delete(cardName); // 删除指定卡片的信息
    }
    public clearCards() {
        this.cards.clear(); // 清空所有卡片的信息
    }
}

export const cardManager = new CardManager();