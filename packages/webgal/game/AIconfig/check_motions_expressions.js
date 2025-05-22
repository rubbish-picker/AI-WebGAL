// 检查controls.json中的motion和expression是否存在于model.json中
const fs = require('fs');

// 读取文件
const controlsData = JSON.parse(fs.readFileSync('./controls.json', 'utf8'));
const modelData = JSON.parse(fs.readFileSync('./model.json', 'utf8'));

// 从model.json中提取所有motion和expression名称
const modelMotions = Object.keys(modelData.motions);
const modelExpressions = modelData.expressions.map(exp => exp.name);

// 存储不存在的motion和expression
const missingMotions = new Set();
const missingExpressions = new Set();

// 遍历controls.json中的figure_table
controlsData.figure_table.forEach(figure => {
    const speaker = figure.speaker;
    
    // 遍历每个角色的refer_table
    Object.entries(figure.refer_table).forEach(([emotion, motionExpressionList]) => {
        motionExpressionList.forEach(item => {
            // 检查motion是否存在
            if (item.motion && !modelMotions.includes(item.motion)) {
                missingMotions.add(`${speaker} - ${emotion} - ${item.motion}`);
            }
            
            // 检查expression是否存在
            if (item.expression && !modelExpressions.includes(item.expression)) {
                missingExpressions.add(`${speaker} - ${emotion} - ${item.expression}`);
            }
        });
    });
});

// 输出结果
console.log('=== 不存在于model.json中的motion ===');
if (missingMotions.size === 0) {
    console.log('所有motion都存在于model.json中');
} else {
    Array.from(missingMotions).sort().forEach(motion => {
        console.log(motion);
    });
    console.log(); // 添加一个空行
}

console.log('=== 不存在于model.json中的expression ===');
if (missingExpressions.size === 0) {
    console.log('所有expression都存在于model.json中');
} else {
    Array.from(missingExpressions).sort().forEach(expression => {
        console.log(expression);
    });
}

// 保存结果到文件
const output = `=== 不存在于model.json中的motion ===\n${
    missingMotions.size === 0 
    ? '所有motion都存在于model.json中' 
    : Array.from(missingMotions).sort().join('\n')
}\n\n=== 不存在于model.json中的expression ===\n${
    missingExpressions.size === 0 
    ? '所有expression都存在于model.json中' 
    : Array.from(missingExpressions).sort().join('\n')
}`;

fs.writeFileSync('./missing_motions_expressions.txt', output, 'utf8');
console.log('\n结果已保存到 missing_motions_expressions.txt');