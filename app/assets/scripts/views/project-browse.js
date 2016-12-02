'use strict';
import React from 'react';
import { connect } from 'react-redux';
import { get } from 'object-path';
import { without, clone } from 'lodash';

import Map from '../components/map';
import ProjectList from '../components/project-list';
import AutoSuggest from '../components/auto-suggest';
import { isOntime } from '../components/project-card';
import { governorates } from '../utils/governorates';
import { GOVERNORATE, getProjectCentroids } from '../utils/map-utils';
import slugify from '../utils/slugify';

const PROJECTS = 'projects';
const INDICATORS = 'indicators';
const indicatorTypes = ['SDS Indicators', 'SDG Indicators', 'Other Development Indicators'];

function countByProp (array, property) {
  const result = {};
  array.forEach((item) => {
    const name = property ? item[property] : item;
    result[name] = result[name] || 0;
    result[name] += 1;
  });
  return result;
}

// Project filters
const STATUS = {
  display: 'Project Status',
  items: [
    { display: 'On Time', filter: isOntime },
    { display: 'Delayed', filter: (p) => !isOntime(p) }
  ]
};

const CATEGORY = {
  display: 'Category',
  items: (projects) => {
    const categories = countByProp(projects.reduce((a, b) => a.concat(b.categories), []));
    return Object.keys(categories).map((category) => ({
      display: `${category} (${categories[category]})`,
      filter: (p) => Array.isArray(p.categories) && p.categories.indexOf(category) >= 0
    }));
  }
};

const DONOR = {
  display: 'Donor',
  items: (projects) => {
    const donors = countByProp(projects.reduce((a, b) => a.concat(b.budget), []), 'donor_name');
    return Object.keys(donors).map((donor) => ({
      display: `${donor} (${donors[donor]})`,
      filter: (p) => Array.isArray(p.budget) && p.budget.find((budget) => budget.donor_name === donor)
    }));
  }
};

const SDS = {
  display: 'SDS Goals',
  items: (projects) => {
    const goals = countByProp(projects.reduce((a, b) => a.concat(b.sds_indicators), []));
    return Object.keys(goals).map((goal) => ({
      display: `${goal} (${goals[goal]})`,
      filter: (p) => Array.isArray(p.sds_indicators) && p.sds_indicators.indexOf(goal) >= 0
    }));
  }
};

const projectFilters = [STATUS, CATEGORY, DONOR, SDS];

var ProjectBrowse = React.createClass({
  displayName: 'ProjectBrowse',

  getInitialState: function () {
    return {

      // modal open or closed
      modal: false,

      // which modal (projects or indicators)
      activeModal: null,

      // is the indicator dropdown open
      indicatorToggle: false,

      // is the view set to list view or map
      listView: false,

      // what's the currently active indicator
      activeIndicatorType: null,
      activeIndicatorTheme: null,
      selectedIndicators: [],
      activeIndicators: [],
      activeIndicator: null,

      // which governorate are we zoomed into
      activeGovernorate: null,

      selectedProjectFilters: [],
      activeProjectFilters: []
    };
  },

  propTypes: {
    api: React.PropTypes.object,
    meta: React.PropTypes.object,
    dispatch: React.PropTypes.func
  },

  zoomToGovernorate: function (event, value) {
    const selected = value.suggestion;
    this.setState({
      activeGovernorate: selected
    });
  },

  // indicator modals
  toggleIndicatorDropdown: function () {
    this.setState({indicatorToggle: !this.state.indicatorToggle});
  },

  openIndicatorSelector: function (activeIndicatorType) {
    activeIndicatorType = activeIndicatorType.split(' ')[0].toUpperCase();
    this.setState({
      modal: true,
      activeModal: INDICATORS,
      indicatorToggle: false,
      activeIndicatorType
    });
  },

  cancelIndicators: function () {
    this.setState({
      modal: false,
      activeIndicatorType: null,
      activeIndicatorTheme: null,
      selectedIndicators: this.state.activeIndicators.length ? clone(this.state.activeIndicators) : []
    });
  },

  confirmIndicators: function () {
    this.setState({
      modal: false,
      activeIndicatorType: null,
      activeIndicatorTheme: null,
      activeIndicators: this.state.selectedIndicators.length ? clone(this.state.selectedIndicators) : []
    });
  },

  selectIndicatorSubType: function (type) {
    this.setState({
      activeIndicatorTheme: type
    });
  },

  // project modal
  openProjectSelector: function () {
    this.setState({
      modal: true,
      indicatorToggle: false,
      activeModal: PROJECTS,
      selectedProjectFilters: this.state.activeProjectFilters.length ? clone(this.state.activeProjectFilters) : []
    });
  },

  toggleSelectedIndicator: function (indicator) {
    let active = this.state.selectedIndicators;
    if (active.indexOf(indicator) >= -0) {
      active = without(active, indicator);
    } else {
      active = active.concat([indicator]);
    }
    this.setState({
      selectedIndicators: active
    });
  },

  cancelFilters: function () {
    this.setState({
      modal: false,
      selectedProjectFilters: this.state.activeProjectFilters.length ? clone(this.state.activeProjectFilters) : []
    });
  },

  confirmFilters: function () {
    this.setState({
      modal: false,
      activeProjectFilters: this.state.selectedProjectFilters.length ? clone(this.state.selectedProjectFilters) : []
    });
  },

  resetProjectFilters: function () {
    this.setState({
      selectedProjectFilters: []
    });
  },

  clearProjectFilters: function () {
    this.setState({
      selectedProjectFilters: [],
      activeProjectFilters: []
    });
  },

  toggleSelectedFilter: function (filter) {
    let selected = this.state.selectedProjectFilters;
    let index = selected.map((f) => f.display).indexOf(filter.display);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected = selected.concat([filter]);
    }
    this.setState({
      selectedProjectFilters: selected
    });
  },

  removeActiveFilter: function (filter) {
    let active = this.state.activeProjectFilters;
    let index = active.map((f) => f.display).indexOf(filter.display);
    active.splice(index, 1);
    this.setState({
      activeProjectFilters: active
    });
  },

  closeModal: function () { this.setState({ modal: false, activeModal: null }); },

  selectListView: function () { this.setState({ listView: true }); },
  selectMapView: function () { this.setState({ listView: false }); },

  renderIndicatorSelector: function () {
    const { selectedIndicators, activeIndicatorTheme, activeIndicatorType } = this.state;
    const indicatorProp = activeIndicatorType.toLowerCase();
    const indicators = get(this.props.api, 'indicators', []).filter((indicator) => {
      return indicator.type && indicator.type[indicatorProp];
    });

    const themes = {};
    indicators.forEach((indicator) => {
      themes[indicator.theme] = themes[indicator.theme] || [];
      themes[indicator.theme].push(indicator);
    });
    const themeNames = Object.keys(themes);
    const availableIndicators = get(themes, activeIndicatorTheme, []);
    return (
      <section className='modal modal--large'>
        <div className='modal__inner modal__indicators'>
          <button className='modal__button-dismiss' title='close' onClick={this.closeModal}></button>
          <h1 className='inpage__title heading--deco heading--medium'>Add {this.state.activeIndicatorType.toUpperCase()} Indicators</h1>
          <p>Add and compare development indicators listed below.</p>

          {selectedIndicators.length ? (
            <div className='indicators--selected'>
              <span className='heading--label'>Selected Indicators:&nbsp;</span>
              {selectedIndicators.map((name) => {
                return (
                  <span className='button--small button--tag'
                    key={name}
                    onClick={() => this.toggleSelectedIndicator(name)}>{name}</span>
                );
              })}
            </div>
          ) : null}
          <div className='indicators__container'>
            <div className='indicators'>
              <ul>
                {themeNames.length && themeNames.map((name) => {
                  return (
                    <li key={name}
                    className={'list__item' + (name === activeIndicatorTheme ? ' list__item--active' : '')}
                    onClick={() => this.selectIndicatorSubType(name)}>{name}</li>
                  );
                })}
              </ul>
            </div>
            <div className='indicators--options'>
              {availableIndicators.length && availableIndicators.map((indicator) => {
                let name = indicator.name;
                let id = 'subtypes-' + slugify(name);
                return (
                  <label key={name}
                    className={'form__option form__option--custom-checkbox' + (selectedIndicators.indexOf(name) >= 0 ? ' form__option--custom--checkbox--selected' : '')}>
                    <input type='checkbox' name='form-checkbox'
                      checked={selectedIndicators.indexOf(name) >= 0}
                      id={id}
                      value={name}
                      onChange={() => this.toggleSelectedIndicator(name)} />
                    <span className='form__option__text'>{name}</span>
                    <span className='form__option__ui'></span>
                  </label>
                );
              })}
            </div>
          </div>
            <ul className='button--list'>
              <li><button
                  onClick={this.confirmIndicators}
                  type='button' className='button button--medium button--primary'>Apply</button></li>
              <li><button
                  onClick={this.cancelIndicators}
                  type='button' className='button button--medium button--primary-bounded'>Cancel</button></li>
            </ul>
        </div>
      </section>
    );
  },

  renderProjectSelector: function () {
    let projects = this.props.api.projects;
    const { selectedProjectFilters } = this.state;
    return (
      <section className='modal modal--large'>
        <div className='modal__inner modal__projects'>
          <h1 className='inpage__title heading--deco heading--medium'>Add and Filter Projects</h1>
          <div className='modal__filters'>
            <div className='modal__filters--defaults'>
              <label className='form__option form__option--custom-checkbox'>
                <input type='checkbox' name='form-checkbox' id='form-checkbox-1' value='Checkbox 1' />
                <span className='form__option__text'>Add All Projects</span>
                <span className='form__option__ui'></span>
              </label>
              <a onClick={this.resetProjectFilters} className='link--secondary'>reset filters</a>
            </div>

            {projectFilters.map((filter) => (

              <fieldset key={filter.display}
                className='form__fieldset'>
                <div className='form__group'>
                  <label className='form__label'>{filter.display}</label>
                  {(Array.isArray(filter.items) ? filter.items : filter.items(projects)).map((item) => (
                    <label key={item.display}
                      className='form__option form__option--custom-checkbox'>
                      <input
                        checked={!!selectedProjectFilters.find((f) => f.display === item.display)}
                        type='checkbox'
                        name='form-checkbox'
                        value={item.display}
                        onChange={() => this.toggleSelectedFilter(item)}
                      />
                      <span className='form__option__text'>{item.display}</span>
                      <span className='form__option__ui'></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <ul className='button--list'>
              <li><button
                  onClick={this.confirmFilters}
                  type='button'
                  className='button button--medium button--primary'>Apply</button></li>
              <li><button
                  onClick={this.cancelFilters}
                  type='button'
                  className='button button--medium button--primary-bounded'>Cancel</button></li>
            </ul>
          </div>
          <button className='modal__button-dismiss' title='close' onClick={this.closeModal}></button>
        </div>
      </section>
    );
  },

  render: function () {
    const selectedClassNames = 'button button--primary';
    const deselectedClassNames = 'button button--primary-bounded';

    let mapLocation;
    const governorateId = get(this.state, 'activeGovernorate.egy');
    if (governorateId) {
      const features = get(this.props.api, 'geography.' + GOVERNORATE + '.features', []);
      mapLocation = features.find((feature) => get(feature, 'properties.admin_id') === governorateId);
    }

    let { projects } = this.props.api;
    const { activeProjectFilters } = this.state;
    if (activeProjectFilters.length) {
      activeProjectFilters.forEach((filter) => {
        projects = projects.filter(filter.filter);
      });
    }

    const markers = getProjectCentroids(projects, get(this.props.api, 'geography.' + GOVERNORATE + '.features'));

    return (
      <section className='inpage'>
        <header className='inpage__header'>
          <div className='inner'>
            <div className='inpage__headline'>
             <div className='inpage__headline-actions'>
                <ul>
                  <li><button type='button' className='button button--medium button--primary'>Share</button></li>
                </ul>
              </div>
                <h1 className='inpage__title heading--deco heading--large'>Projects and Indicators</h1>
                <p className='inpage__description'>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ut augue aliquet ligula aliquam. Lorem ipsum dolor sit amet, consectetur elit. </p>
            </div>
            <div className='inpage__actions'>
            <div className='actions-filters'>
                <ul className='button--list'>
                  <li onClick={this.openProjectSelector}><button type='button' className='button button--medium button--primary'>Add &amp; Filter Projects</button></li>
                  <li>
                    <span className='dropdown__container'>
                      <button type='button' onClick={this.toggleIndicatorDropdown}
                        className='button button--medium button--secondary drop__toggle--caret'>Add Indicator Overlays</button>
                      {this.state.indicatorToggle &&
                        <ul className='drop__menu drop__content button--secondary'>
                          {indicatorTypes.map((d) => {
                            return <li key={d}
                              onClick={() => this.openIndicatorSelector(d)}
                              className='drop__menu-item'>{d}</li>;
                          })}
                        </ul>
                      }
                    </span>
                  </li>
                </ul>
                {activeProjectFilters.length ? (
                  <div className='filters'>
                    <label className='heading--label'>Filters</label>
                    {activeProjectFilters.map((filter) => (
                      <button
                        onClick={() => this.removeActiveFilter(filter)}
                        key={filter.display}
                        className='button button--small button--tag'>{filter.display}</button>
                    ))}
                    <button
                      onClick={this.clearProjectFilters}
                      className='button button--xsmall button--tag-unbounded'>Clear Filters</button>
                  </div>
                ) : null}
              </div>
              <div className='actions-toggle'>
                <div className='button-group button-group--horizontal button--toggle'>
                  <button onClick={this.selectMapView} className={this.state.listView ? deselectedClassNames : selectedClassNames}>Map</button>
                  <button onClick={this.selectListView} className={this.state.listView ? selectedClassNames : deselectedClassNames}>List</button>
                </div>
              </div>
            </div>
            <div className='autosuggest'>
              <AutoSuggest
                suggestions={governorates}
                getDisplayName={(d) => d.name}
                placeholder='Zoom to Governorate'
                onSelect={this.zoomToGovernorate}
              />
            </div>
          </div>
        </header>

        {this.state.listView
          ? <ProjectList projects={projects} meta={this.props.meta} />
          : <Map location={mapLocation} markers={markers}/>}

        {this.state.modal && this.state.activeModal === PROJECTS && this.renderProjectSelector()}
        {this.state.modal && this.state.activeModal === INDICATORS && this.renderIndicatorSelector()}

      </section>
    );
  }
});

function mapStateToProps (state) {
  return {
    api: state.api,
    meta: state.meta
  };
}

module.exports = connect(mapStateToProps)(ProjectBrowse);
