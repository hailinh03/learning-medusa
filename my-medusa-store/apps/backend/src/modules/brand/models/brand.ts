import { model } from "@medusajs/framework/utils";

// định nghĩa bảng
export const Brand = model.define("brand", {
    id: model.id().primaryKey(),
    name: model.text(),
})