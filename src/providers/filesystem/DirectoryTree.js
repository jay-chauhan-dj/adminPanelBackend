require('dotenv').config();  // Loading environment variables from a .env file
const fs = require("fs");
const path = require("path");

class DirectoryTree {
    constructor() {
        this.directoryPath = process.env.DIRECTORY_TREE_PATH;
    }

    generateTree(dirPath = this.directoryPath) {
        const stats = fs.statSync(dirPath);
        if (!stats.isDirectory()) {
            throw new Error("Provided path is not a directory");
        }

        return this.buildTree(dirPath);
    }

    buildTree(dirPath) {
        const tree = {
            name: path.basename(dirPath),
            type: "folder",
            children: [
                { name: "Back", type: "back", children: [] } // Mandatory "Back" node
            ]
        };

        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const itemStats = fs.statSync(itemPath);

            if (itemStats.isDirectory()) {
                tree.children.push(this.buildTree(itemPath));
            } else {
                tree.children.push({
                    name: item,
                    type: "file"
                });
            }
        }

        return tree;
    }
}

module.exports = DirectoryTree;