// where each role lands after login
export const homeFor = (role) =>
  ({
    super_admin: '/admin',
    area_manager: '/manager',
    business: '/business',
  })[role] ?? '/mobile-only'

export const roleLabel = {
  super_admin: 'Super Admin',
  area_manager: 'Area Manager',
  business: 'Business Buyer',
  farmer: 'Farmer',
  customer: 'Customer',
}
