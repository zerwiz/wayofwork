const fs = require('fs');
const filePath = 'src/components/work/kanban/WorkBoard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startTag = '      {/* Kanban Board */}';
const endTag = '      )}'; // Need to be very careful to match the right one
const startIndex = content.indexOf(startTag);
// Find the end tag after the start tag
const endIndex = content.indexOf(endTag, startIndex) + endTag.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + content.substring(endIndex);
    fs.writeFileSync(filePath, newContent);
    console.log('Deleted block');
} else {
    console.log('Could not find block');
}
