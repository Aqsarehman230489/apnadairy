// sidebar items per role. "ready: false" items show a module placeholder until built.
export const navFor = {
  super_admin: [
    { to: '/admin', label: 'Overview', icon: 'grid', end: true, ready: true },
    { to: '/admin/approvals', label: 'Approvals', icon: 'check', ready: true },
    { to: '/admin/users', label: 'Users', icon: 'users' },
    { to: '/admin/iot-devices', label: 'IoT Devices', icon: 'chip' },
    { to: '/admin/pricing', label: 'Dynamic Pricing', icon: 'tag' },
    { to: '/admin/complaints', label: 'Complaints & Support', icon: 'chat' },
    { to: '/admin/analytics', label: 'Analytics', icon: 'chart' },
  ],
  area_manager: [
    { to: '/manager', label: 'Overview', icon: 'grid', end: true, ready: true },
    { to: '/manager/farmers', label: 'Farmers', icon: 'users' },
    { to: '/manager/collection', label: 'Milk Collection', icon: 'drop' },
    { to: '/manager/iot', label: 'IoT Readings', icon: 'chip' },
    { to: '/manager/ai-pricing', label: 'AI Price Engine', icon: 'spark' },
    { to: '/manager/inventory', label: 'Inventory', icon: 'box' },
    { to: '/manager/b2b', label: 'B2B Bidding', icon: 'gavel' },
    { to: '/manager/support', label: 'Support', icon: 'chat' },
  ],
  business: [
    { to: '/business', label: 'Overview', icon: 'grid', end: true, ready: true },
    { to: '/business/requirements', label: 'Bulk Requirements', icon: 'box' },
    { to: '/business/bids', label: 'Bids & Quotations', icon: 'gavel' },
    { to: '/business/orders', label: 'Bulk Orders', icon: 'truck' },
    { to: '/business/support', label: 'Support', icon: 'chat' },
  ],
}
