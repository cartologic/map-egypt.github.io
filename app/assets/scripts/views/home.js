'use strict';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { tally, shorterTally } from '../utils/format';
import { get } from 'object-path';
import path from 'path';
import { window } from 'global';
import Map from '../components/map';
import HorizontalBarChart from '../components/charts/horizontal-bar';
import PieChart from '../components/charts/pie';
import { isOntime } from '../components/project-card';
import { getProjectCentroids } from '../utils/map-utils';
import slugify from '../utils/slugify';

const barChartMargin = { left: 200, right: 10, top: 10, bottom: 50 };

var Home = React.createClass({
  displayName: 'Home',

  propTypes: {
    api: React.PropTypes.object,
    meta: React.PropTypes.object
  },

  render: function () {
    const { projects } = this.props.api;
    const { lang } = this.props.meta;

    const basepath = '/' + this.props.meta.lang;
    const t = get(window.t, [lang, 'homepage'], {});
    // international projects
    let internationalProjects = [];
    internationalProjects = this.props.api.InternationalProjects;
    const totalInternational = internationalProjects.length;
    // national projects
    let nationalProjects = [];
    nationalProjects = this.props.api.NationalProjects;
    const totalNational = nationalProjects.length;

    function getPie (p) {
      const status = { ontime: 0, delayed: 0, extended: 0 };
      p.forEach(function (project) {
        const ontime = isOntime(project, lang);
        if (ontime === null) {
          return;
        } else if (ontime === 'Delayed' || ontime === 'متأخر') {
          status.delayed += 1;
        } else if (ontime === 'Extended' || ontime === 'ممتد') {
          status.extended += 1;
        } else {
          status.ontime += 1;
        }
      });
      const pie = [{
        name: 'On Time',
        name_ar: 'فى الميعاد',
        value: status.ontime
      }, {
        name: 'Delayed',
        name_ar: 'متأخر',
        value: status.delayed
      }, {
        name: 'Extended',
        name_ar: 'ممتد',
        value: status.extended
      }];
      return pie;
    }

    function getBars (p) {
      const categories = {};
      p.forEach(function (project) {
        get(project, 'categories', []).forEach(function (category) {
          categories[category[lang]] = categories[category[lang]] + 1 || 1;
        });
      });
      const bars = Object.keys(categories).map((category) => ({
        name: category,
        link: path.resolve(basepath, 'category', slugify(category)),
        value: categories[category]
      })).sort((a, b) => b.value > a.value ? -1 : 1);

      return bars;
    }
/*******************function for get budgets summary for international project ********************** */
    function getInternationalBudgetsSummary (p) {
      let budgetSummary = {loan: 0, grant: 0, 'local contribution': 0};
      p.forEach((project) => {
        let budgets = project.budget || [];
        budgets.forEach((fund) => {
          if (fund && fund.type && fund.type.en) {
            budgetSummary[fund.type.en.toLowerCase()] += fund.fund.amount;
          }
        });
      });
      budgetSummary = [
        {name: 'Loan', name_ar: 'قرض', value: budgetSummary.loan},
        {name: 'Grant', name_ar: 'منحة', value: budgetSummary.grant},
        {name: 'Local Contribution', name_ar: 'مساهمة محلية', value: budgetSummary['local contribution']}
      ];
      return budgetSummary;
    }

    /************ function for get budgets summary for national project ************/
    function getNationalBudgetsSummary (p) {
      let budgetSummary = {'government budget allocation':0, 'in-kind':0, loan: 0, 'private sector':0 ,'local non-profit organization': 0, grant: 0};
      p.forEach((project) => {
        let budgets = project.budget || [];
        console.log(budgets)
        budgets.forEach((fund) => {
          if (fund && fund.type && fund.type.en) {
            budgetSummary[fund.type.en.toLowerCase()] += fund.fund.amount;
          }
        });
      });

      budgetSummary = [
        {name: 'Government Budget Allocation', name_ar: 'تخصيص من الميزانية الحكومية', value: budgetSummary['government budget allocation']},
        {name: 'In-Kind', name_ar: 'عينياً', value: budgetSummary['in-kind']},
        {name: 'Loan', name_ar: 'قرض', value: budgetSummary.loan},
        {name: 'Private Sector', name_ar: 'قطاع خاص', value: budgetSummary['private sector']},
        {name: 'Local Non-Profit Organization', name_ar: 'جهة محلية غير هادفة للربح', value: budgetSummary['local non-profit organization']},
        {name: 'Grant', name_ar: 'منحة', value: budgetSummary.grant}
      ];
      return budgetSummary;
    }

    const markers = getProjectCentroids(projects, this.props.api.geography);
    // total funding for international projects
    let totalFundingInternational = 0;
    // total funding for national projects
    let totalFundingNational = 0;

    // set total funding for international projects
    internationalProjects.forEach((project) => {
      let budgets = project.budget || [];

      budgets.forEach((budget) => {
        totalFundingInternational += budget.fund.amount;
      });
    });
    totalFundingInternational = shorterTally(totalFundingInternational);
    // set total funding for national projects
    nationalProjects.forEach((project) => {
      let budgets = project.budget || [];

      budgets.forEach((budget) => {
        totalFundingNational += budget.fund.amount;
      });
    });
    totalFundingNational = shorterTally(totalFundingNational);

    return (
      <div>
      <section className='inpage home'>
        <header className='inpage__header'>
          <div className='inner'>
            <p className='inpage__subtitle--alt'>{t.subhead}</p>
            <h1 className='inpage__title heading--deco heading--xxlarge'>{t.title}</h1>
            <div className='inpage__introduction'>
              <p className='inpage__description'>{t.description}</p>
              <Link to={basepath + '/about'} type='button' className='button button--primary button--large'>{t.more}</Link>
            </div>
          </div>
        </header>
        <div className='inpage__body'>
          <div className='inner'>
          <div className="help-message pt-20">
            <span className="help-marker ">{t.map_help_message}</span>
          </div>
            <Map markers={markers} lang={lang} />
            <section className='inpage__section'>
              <div className='overview-home'>
                <h2 className='section__title'>{t.stats_overview}</h2>
                <p className='section__description'>{t.overview_description}</p>
                <ul className='category-stats'>
                  <li className='category-stats__item'>
                    <h3 className='inpage-stats heading--deco-small'>{totalInternational}<small>{t.total} {t.international_projects_type}</small></h3>
                  </li>
                  <li className='category-stats__item'>
                    <h3 className='inpage-stats heading--deco-small'>{totalFundingInternational} <span>{t.currency_international_projects}</span> <small>{t.in_funding} {t.international_projects_type}</small></h3>
                  </li>
                  <li className='category-stats__item'>
                    <h3 className='inpage-stats heading--deco-small'>{totalNational}<small>{t.total} {t.national_projects_type}</small></h3>
                  </li>
                  <li className='category-stats__item'>
                    <h3 className='inpage-stats heading--deco-small'> {totalFundingNational} <span>{t.currency_national_projects}</span> <small>{t.in_funding} {t.national_projects_type}</small></h3>
                  </li>
                </ul>
              </div>
              <div className='overview-home-charts'>
                <h3 className="project-title">{t.international_projects_type}</h3>
                <div className='chart-content chart__inline--labels'>
                  <h3>{t.chart_title_one}</h3>
                  <HorizontalBarChart
                    lang={lang}
                    data={getBars(internationalProjects)}
                    margin={barChartMargin}
                    xFormat={tally}
                    yTitle='' />
                </div>
                <div className='chart-content chart__inline--labels chart-content--status'>
                  <h3>{t.chart_title_two}</h3>
                  <PieChart data={getPie(internationalProjects)} lang={lang} />
                  <div className='status-key'>
                    <p className='status-key__label status-ontime'>{t.chart_two_label}</p>
                    <p className='status-key__label status-delayed'>{t.chart_two_label2}</p>
                    <p className='status-key__label status-extended last'>{t.chart_two_label3}</p>
                  </div>
                </div>
                <div className='chart-content chart__inline--labels chart-content--status'>
                  <h3>{t.chart_title_three} {`( ${t.currency_international_projects} )`}</h3>
                  <PieChart data={getInternationalBudgetsSummary(internationalProjects)} lang={lang} format={shorterTally} projectCurrency={t.currency_international_projects} />
                  <div className='status-key'>
                    <p className='status-key__label budget-loan'>{t.chart_three_label}</p>
                    <p className='status-key__label budget-grant'>{t.chart_three_label2}</p>
                    <p className='status-key__label budget-local last'>{t.chart_three_label3}</p>
                  </div>
                </div>
              </div>
              <div className='section__footer'>
                <Link to={basepath + '/international_projects'} type='button' className='button button--primary button--large' style={{marginBottom: '25px'}} >{t.all_international_projects_btn}</Link>
              </div>
              <div className='overview-home-charts'>
                <h3 className="project-title">{t.national_projects_type}</h3>
                <div className='chart-content chart__inline--labels'>
                  <h3>{t.chart_title_one}</h3>
                  <HorizontalBarChart
                    lang={lang}
                    data={getBars(nationalProjects)}
                    margin={barChartMargin}
                    xFormat={tally}
                    yTitle='' />
                </div>
                <div className='chart-content chart__inline--labels chart-content--status'>
                  <h3>{t.chart_title_two}</h3>
                  <PieChart data={getPie(nationalProjects)} lang={lang} />
                  <div className='status-key'>
                    <p className='status-key__label status-ontime'>{t.chart_two_label}</p>
                    <p className='status-key__label status-delayed'>{t.chart_two_label2}</p>
                    <p className='status-key__label status-extended last'>{t.chart_two_label3}</p>
                  </div>
                </div>
                <div className='chart-content chart__inline--labels chart-content--status'>
                  <h3>{t.chart_title_three} {`( ${t.currency_national_projects} )`} </h3>
                  <PieChart data={getNationalBudgetsSummary(nationalProjects)} lang={lang} format={shorterTally} projectCurrency={t.currency_national_projects}/>
                  <div className='status-key'>
                    <p className='status-key__label budget-allocation'>{t.chart_three_label5}</p>
                    <p className='status-key__label budget-in-kind'>{t.chart_three_label6}</p>
                    <p className='status-key__label budget-loan '>{t.chart_three_label}</p>
                    <p className='status-key__label budget-private'>{t.chart_three_label7}</p>
                    <p className='status-key__label budget-grant '>{t.chart_three_label2}</p>
                    <p className='status-key__label budget-non-profit last'>{t.chart_three_label4}</p>
                  
                  </div>
                </div>
              </div>
              <div className='section__footer'>
                <Link to={basepath + '/national_projects'} type='button' className='button button--primary button--large'>{t.all_national_projects_btn}</Link>
              </div>
            </section>
          </div>
          <section className='inpage__section--bleed'>
            <h2 className='section__title'>{t.other_indicators_title}</h2>
            <p className='section__description'>{t.other_indicators_description}</p>
            <ul className='section__footer'>
              <li><Link to={'/' + lang + '/projects_sds'} type='button' className='button button--primary button--large'>{t.sds_button}</Link></li>
              <li><Link to={'/' + lang + '/projects_sdg'} type='button' className='button button--primary button--large'>{t.sdg_button}</Link></li>
              <li><Link to={'/' + lang + '/projects_other'} type='button' className='button button--primary button--large'>{t.other_button}</Link></li>
            </ul>
          </section>
        </div>
      </section>
      </div>
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

module.exports = connect(mapStateToProps)(Home);
