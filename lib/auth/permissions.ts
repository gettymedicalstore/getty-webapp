export enum Permission {
  VIEW_PRODUCTS = "view_products",
  CREATE_PRODUCTS = "create_products",
  UPDATE_PRODUCTS = "update_products",
  DELETE_PRODUCTS = "delete_products",
  MANAGE_USERS = "manage_users",
  MANAGE_ORDERS = "manage_orders",
}

export function hasPermission(
  permissions: Permission[],
  permission: Permission
) {
  return permissions.includes(permission)
}
