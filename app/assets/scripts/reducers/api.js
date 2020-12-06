'use strict';
import { get, set } from 'object-path';
import {
  AUTHENTICATED,
  PROJECTS,
  INTERNATIONAL_PROJECTS,
  NATIONAL_PROJECTS,
  PROJECT,
  INDICATORS,
  INDICATOR,
  GEOGRAPHY
} from '../actions';

export const initialState = {
  authenticated: false,
  projects: [],
  InternationalProjects: [],
  NationalProjects: [],
  projectDetail: {},
  indicators: [],
  geography: {}
};

import { DISTRICT } from '../utils/map-utils';

export default function reducer (state = initialState, action) {
  state = Object.assign({}, state);
  switch (action.type) {
    case AUTHENTICATED:
      set(state, 'authenticated', action.data);
      break;
    case PROJECTS:
      set(state, 'projects', action.data);
      break;
    case INTERNATIONAL_PROJECTS:
      set(state, 'InternationalProjects', action.data.filter(project => project.published));
      break;
    case NATIONAL_PROJECTS:
      set(state, 'NationalProjects', action.data.filter(project => project.published));
      break;
    case PROJECT:
      set(state, ['projectDetail', action.data.id], action.data);
      break;
    case INDICATORS:
      set(state, 'indicators', action.data.filter(indicator => indicator.published));
      break;
    case INDICATOR:
      set(state, ['indicatorDetail', action.data.id], action.data);
      break;
    case GEOGRAPHY:
      // normalize district admin properties
      if (action.data.name === DISTRICT) {
        get(action.data.features, 'features', []).forEach((feature) => {
          let id = feature.properties.Qism_Mar_1;
          feature.properties.admin_id = 'EGY' + id;
        });
      }
      set(state, ['geography', action.data.name], action.data.features);
      break;
  }
  return state;
}
