'use strict';
import React from 'react';
import { connect } from 'react-redux';
import { get } from 'object-path';
import Share from '../components/share';
import Map from '../components/map';
import ProjectCard from '../components/project-card';
import ProjectTimeline from '../components/project-timeline';
import slugify from '../utils/slugify';
import { GOVERNORATE, getProjectCentroids, getFeatureCollection } from '../utils/map-utils';

var Ministry = React.createClass({
  displayName: 'Ministry',

  propTypes: {
    params: React.PropTypes.object,
    location: React.PropTypes.object,
    api: React.PropTypes.object,
    meta: React.PropTypes.object
  },

  render: function () {
    const projects = get(this.props, 'api.projects', []);
    if (projects.length === 0) {
      return <div></div>; // TODO loading indicator
    }

    const ministryName = this.props.params.name;
    let ministryDisplayName;

    const lang = this.props.meta.lang;
    let ministryProjects = projects.filter((project) => {
      const name = project.responsible_ministry[lang];
      const sluggedName = slugify(name);
      if (sluggedName === ministryName) {
        ministryDisplayName = name;
      }
      return sluggedName === ministryName;
    });
    const markers = getProjectCentroids(ministryProjects, get(this.props.api, 'geography.' + GOVERNORATE + '.features'));
    const mapLocation = getFeatureCollection(markers);

    const singleProject = ministryProjects.length <= 1 ? ' funding--single' : '';
    const activeProjects = ministryProjects.filter((project) => project.actual_end_date).length;
    console.log(this.props.api)


    return (
      <section className='inpage funding'>
        <header className='inpage__header'>
          <div className='inner'>
            <div className='inpage__headline'>
              <div className='inpage__headline-actions'>
                <ul>
                  <li><button className='button button--medium button--primary button--download'>Download</button></li>
                  <li><Share path={this.props.location.pathname}/></li>
                </ul>
              </div>
              <h1 className='inpage__title heading--deco heading--large'>{ministryDisplayName}</h1>
            </div>
            {ministryProjects.map((project, i) => {
              if (!project.actual_end_date) {
                return (
                  <div key ={'timeline-' + i}>
                    <h5>{project.name}</h5>
                    <ProjectTimeline project={project} />
                  </div>
                );
              }
            })}
          </div>
        </header>
        <div className={'inpage__body funding' + singleProject}>
          <div className='inner'>
            <section className='inpage__section inpage__section--overview'>

              <h1 className='visually-hidden'>Project Overview</h1>
              <div className='inpage__col--map'>
                <Map markers={markers} location={mapLocation} />
              </div>
              <div className='inpage__col--content'>
                <ul className='inpage-stats'>
                  <li> {activeProjects} <small>Active {activeProjects > 1 ? 'Projects' : 'Project'}</small></li>
                  <li> {ministryProjects.length} <small>Total {ministryProjects.length > 1 ? 'Projects' : 'Project'}</small></li>
                </ul>
              </div>
            </section>
          </div>

          <section className='inpage__section--bleed'>
            <div className='inner'>
              <h1 className='section__title heading--small'>Projects Overseen</h1>
              <ul className='projects-list'>
                {ministryProjects.map((p) => {
                  return (
                    <li key={p.id} className='projects-list__card'>
                      <ProjectCard lang={this.props.meta.lang}
                        project={p} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      </section>
    );
  }
});

// /////////////////////////////////////////////////////////////////// //
// Connect functions

function mapStateToProps (state) {
  return {
    api: state.api,
    meta: state.meta
  };
}

module.exports = connect(mapStateToProps)(Ministry);
