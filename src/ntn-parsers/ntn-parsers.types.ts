type T_ParsedBlockBase = { id?: string; children?: T_ParsedBlock[] }

type T_ParsedBlockText     = T_ParsedBlockBase & { type: "paragraph" | "quote" | "bulleted_list_item" | "numbered_list_item" | "toggle"; text: string; isCode?: boolean; html?: string }
type T_ParsedBlockHeading  = T_ParsedBlockBase & { type: "heading_1" | "heading_2" | "heading_3" | "heading_4"; text: string; level: 1 | 2 | 3 | 4 }
type T_ParsedBlockToDo     = T_ParsedBlockBase & { type: "to_do"; text: string; checked: boolean }
type T_ParsedBlockCode     = T_ParsedBlockBase & { type: "code"; text: string; language: string }
type T_ParsedBlockCallout  = T_ParsedBlockBase & { type: "callout"; text: string; icon?: string }
type T_ParsedBlockMedia    = T_ParsedBlockBase & { type: "image" | "video" | "audio" | "pdf" | "file"; url: string; caption?: string }
type T_ParsedBlockLink     = T_ParsedBlockBase & { type: "bookmark" | "embed" | "link_preview"; url: string; caption?: string }
type T_ParsedBlockEquation = T_ParsedBlockBase & { type: "equation"; expression: string }
type T_ParsedBlockDivider  = T_ParsedBlockBase & { type: "divider" }
type T_ParsedBlockTable    = T_ParsedBlockBase & { type: "table"; has_column_header: boolean; has_row_header: boolean; rows: string[][] }
type T_ParsedBlockTableRow = T_ParsedBlockBase & { type: "table_row"; cells: string[] }
type T_ParsedBlockColumn   = T_ParsedBlockBase & { type: "column_list" | "column" }
type T_ParsedBlockChildRef = T_ParsedBlockBase & { type: "child_page" | "child_database"; title: string }
type T_ParsedBlockList     = { type: "bulleted_list" | "numbered_list"; items: T_ParsedBlock[] }
type T_ParsedBlockOther    = T_ParsedBlockBase & { type: "breadcrumb" | "table_of_contents" | "tab" | "synced_block" | "template" | "link_to_page" | "meeting_notes" | "transcription" | "unsupported" }

export type T_ParsedBlock =
    | T_ParsedBlockText
    | T_ParsedBlockHeading
    | T_ParsedBlockToDo
    | T_ParsedBlockCode
    | T_ParsedBlockCallout
    | T_ParsedBlockMedia
    | T_ParsedBlockLink
    | T_ParsedBlockEquation
    | T_ParsedBlockDivider
    | T_ParsedBlockList
    | T_ParsedBlockTable
    | T_ParsedBlockTableRow
    | T_ParsedBlockColumn
    | T_ParsedBlockChildRef
    | T_ParsedBlockOther
