import { PROPERTY_ITEM_OBJECT_RESPONSE, richText2String } from "./ndbe.utils";
import { T_GenerateTSInterfaceOptions } from "./ndbe.types";
import { DataSourceObjectResponse } from "@notionhq/client";

export function generateTSInterface(schema: DataSourceObjectResponse, options?: T_GenerateTSInterfaceOptions) {
    const notionObjectResponseTypes: string[] = [];

    const interfaceName = `${options?.prefix || ''}${richText2String(schema.title)}${options?.suffix || ''}`;
    let iface = `export interface ${interfaceName} {\n`;

    const properties: string[] = [];
    for (const [key, value] of Object.entries(schema.properties)) {
        if (options?.excludeProperties && options.excludeProperties.includes(key)) continue;
        if (options?.includeProperties && !options.includeProperties.includes(key)) continue;

        const type = getPropertyTypeDefinition(schema.properties[key].type);
        if (type) {
            notionObjectResponseTypes.push(type);
            properties.push(key);
            iface += `    "${key}": ${type};\n`;
        } else {
            iface += `    // [PROPERTY TYPE DEFINITION NOT FOUND] key:${key} - type:${schema.properties[key].type}\n`;
        }
    }

    iface += `};`;

    const imports = `import {${notionObjectResponseTypes.join(', ')}} from '@notionhq/client'\n`;

    return {
        imports,
        types: notionObjectResponseTypes,
        interface: iface,
        interfaceName,
        properties
    };

}


function getPropertyTypeDefinition(type: string) {
    return PROPERTY_ITEM_OBJECT_RESPONSE.find((pt) => pt.toLowerCase().replaceAll("_", "").includes(type.toLowerCase()))
}