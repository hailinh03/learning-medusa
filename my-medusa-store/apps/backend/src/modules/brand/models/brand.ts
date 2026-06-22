import { model } from "@medusajs/framework/utils";

// định nghĩa bảng tương tự @Entity: Định nghĩa cấu trúc bảng trong Database.
export const Brand = model.define("brand", {
    id: model.id().primaryKey(),
    name: model.text(),
})