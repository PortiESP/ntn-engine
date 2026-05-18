import { PROPERTY_ITEM_OBJECT_RESPONSE, richText2String } from "./ntn-fetcher.utils";
import { T_GenerateTSInterfaceOptions } from "./ntn-fetcher.types";
import { DataSourceObjectResponse } from "@notionhq/client";

export function generateTSInterface(schema: DataSourceObjectResponse, options?: T_GenerateTSInterfaceOptions) {
    const notionObjectResponseTypes: string[] = [];

    const interfaceName = `${options?.prefix || ''}${richText2String(schema.title)}${options?.suffix || ''}`;
    let iface = `export interface ${interfaceName} {\n`;

    const properties: string[] = [];
    for (const [propertyKey, propertyValue] of Object.entries(schema.properties)) {
        if (options?.excludeProperties && options.excludeProperties.includes(propertyKey)) continue;
        if (options?.includeProperties && !options.includeProperties.includes(propertyKey)) continue;

        const type = getPropertyTypeDefinition(propertyValue.type);
        if (type) {
            notionObjectResponseTypes.push(type);
            properties.push(propertyKey);
            iface += `    "${propertyKey}": ${type};\n`;
        } else {
            iface += `    // [PROPERTY TYPE DEFINITION NOT FOUND] key:${propertyKey} - type:${propertyValue.type}\n`;
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