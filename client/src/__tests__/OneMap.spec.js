import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import OneMap from '../components/OneMap.vue'
import axios from 'axios'
import L from 'leaflet'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))
vi.mock('leaflet', () => ({
  default: {
    latLng: vi.fn(),
    latLngBounds: vi.fn(),
    CRS: { EPSG4326: {} },
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      setMaxBounds: vi.fn().mockReturnThis(),
      removeLayer: vi.fn(),
    })),
    tileLayer: { wms: vi.fn(() => ({ addTo: vi.fn() })) },
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      openPopup: vi.fn().mockReturnThis(),
    })),
  },
}))

it('displays a marker at the coordinates from postal-code search', async () => {
  axios.get.mockResolvedValue({ data: {
    results: [{ LATITUDE: '1.3521', LONGITUDE: '103.8198', ADDRESS: 'TEST ADDRESS', BUILDING: 'TEST' }],
  } })
  const wrapper = mount(OneMap, { props: { address: 'TEST ADDRESS 123456' } })
  try {
    await wrapper.vm.initialiseOneMap()
    await wrapper.get('#pinPostalCodeBtn').trigger('click')
    await flushPromises()
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/map\/123456$/))
    expect(L.marker).toHaveBeenCalledWith([1.3521, 103.8198])
    const marker = L.marker.mock.results[0].value
    expect(marker.openPopup).toHaveBeenCalledOnce()
    expect(L.map.mock.results[0].value.setView).toHaveBeenLastCalledWith([1.3521, 103.8198], 17)
  } finally {
    wrapper.unmount()
  }
})
