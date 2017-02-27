import Promise from 'bluebird';

import rp from 'request-promise';
import moment from 'moment';

import string from '../../util/string';
import logger from '../../util/logging';

// http://reisapi.ruter.no/help
const API_URL = 'https://reisapi.ruter.no';

const TRANSPORT_TYPES = {
  0 : 'gå',
  1 : 'flybuss',
  2 : 'buss',
  3 : 'dummy',
  4 : 'flytog',
  5 : 'båt',
  6 : 'tog',
  7 : 'trikk',
  8 : 't-bane'
};

let CACHED_STOPS = {};

export function get_all_stops() {
  //  /Place/GetStopsRuter
  if (CACHED_STOPS.length > 0) {
    return CACHED_STOPS;
  }
  return new Promise((resolve, reject) => {
    let options = {
      method: 'GET',
      uri: `${API_URL}/Place/GetStopsRuter`,
      headers : {
        'Content-type' : 'application/json'
      },
      json: true
    };
    rp(options)
      .then(response => {
        response.forEach(stop => {
          CACHED_STOPS[stop.ID] = {
            id : stop.ID,
            name : stop.Name,
            x : stop.X,
            y : stop.Y
          };
        });
        return resolve(CACHED_STOPS);
      })
      .catch(error => {
        return reject(error);
      });
  });
}

export function get_stop_info(stop_id) {
  //  /Place/GetStop/{id}

  return new Promise((resolve, reject) => {
    if (!stop_id) {
      return resolve(null);
    }
    if (CACHED_STOPS[stop_id]) {
      return resolve(CACHED_STOPS[stop_id]);
    }
    let options = {
      method: 'GET',
      uri: `${API_URL}/Place/GetStop/`,
      qs : {
        id : stop_id
      },
      headers : {
        'Content-type' : 'application/json'
      },
      json: true
    };
    rp(options)
      .then(response => {
        // logger.debug(response);
        CACHED_STOPS[response.ID] = {
          id : response.ID,
          name : response.Name,
          x : response.X,
          y : response.Y
        };
        return resolve(CACHED_STOPS[response.ID]);
      })
      .catch(error => {
        return reject(error);
      });
  });

}

export function search_stops(search) {
  // /Place/GetPlaces/{id}?location={location}
  return new Promise((resolve, reject) => {
    let options = {
      method: 'GET',
      uri: `${API_URL}/Place/GetPlaces/${search}`,
      headers : {
        'Content-type' : 'application/json'
      },
      json: true
    };
    rp(options)
      .then(response => {
        // logger.debug(response);
        let stops = [];
        response.forEach(stop => {
          if (!CACHED_STOPS[stop.ID]) {
            CACHED_STOPS[stop.ID] = {
              id : stop.ID,
              name : stop.Name,
              x : stop.X,
              y : stop.Y,
            };
          }
          stops.push(CACHED_STOPS[stop.ID]);
        });
        return resolve(stops);
      })
      .catch(error => {
        return reject(error);
      });
  });
}

function search_and_propose(from, to, date) {
  let stops = [];
  stops.push(search_stops(from));
  stops.push(search_stops(to));
  return Promise.all(stops)
    .then(found_stops => {
      let from_stop = found_stops[0][0];
      let to_stop = found_stops[1][0];
      // logger.debug(string.format('%s -> %s', from_stop.name, to_stop.name));
      return travel_proposals(from_stop.id, to_stop.id, date);
    })
    .catch(error => {
      logger.error(error);
      return [];
    });
}

function travel_proposals(from, to, date) {
  // http://reisapi.ruter.no/Help/Api/GET-Travel-GetTravels_fromPlace_toPlace_isafter_time_changemargin_changepunish_walkingfactor_proposals_transporttypes_maxwalkingminutes_linenames_walkreluctance_waitAtBeginningFactor
  if (!date) {
    date = moment();
  }
  return new Promise((resolve, reject) => {
    let time = date.format('DDMMYYYYHHmmss');
    // logger.debug(from, to, date, time);
    let options = {
      method: 'GET',
      uri: `${API_URL}/Travel/GetTravels/`,
      qs : {
        fromPlace : from,
        toPlace : to,
        isafter : true,
        time : time
      },
      headers : {
        'Content-type' : 'application/json'
      },
      json: true
    };
    rp(options)
      .then(response => {
        // logger.debug(response);
        let proposals = [];
        if (response.TravelProposals) {
          response.TravelProposals.slice(0, 1).forEach(proposal => {
            let stages = [];
            // logger.debug(proposal);

            proposal.Stages.forEach(stage => {
              // logger.debug(stage);
              // logger.debug(stage.ArrivalStop);
              // logger.debug(stage.ArrivalPoint);
              try {
                if (stage.ArrivalPoint) {
                  stages.push({
                    departure_time : stage.DepartureTime,
                    arrival_time : stage.ArrivalTime,
                    travel_time : stage.WalkingTime,
                    line_id : null,
                    line_name : '',
                    transport_type_id : stage.Transportation,
                    transport_type_name : TRANSPORT_TYPES[stage.Transportation]
                  });
                } else {
                  stages.push({
                    departure_time : stage.DepartureTime,
                    arrival_time : stage.ArrivalTime,
                    travel_time : stage.TravelTime,
                    line_id : stage.LineID,
                    line_name : stage.LineName,
                    destination : stage.Destination,
                    transport_type_id : stage.Transportation,
                    transport_type_name : TRANSPORT_TYPES[stage.Transportation],
                    from_stop_id : stage.DepartureStop.ID,
                    to_stop_id : stage.ArrivalStop.ID
                  });
                }
              } catch (error) {
                logger.error(error);
              }
            });
            proposals.push({
              departure_time : proposal.DepartureTime,
              arrival_time : proposal.ArrivalTime,
              travel_time : proposal.TotalTravelTime,
              stages : stages
            });
          });
        }
        return resolve(proposals);
      })
      .catch(error => {
        logger.error(error);
        return reject(error);
      });
  });
}

export function get_travels_formatted(from, to, date) {
  return new Promise((resolve, reject) => {
    get_all_stops()
      .then(() => {
        // search_and_propose('Grefsen', 'Sentrum Scene', date)
        search_and_propose(from, to, date)
          .then(response => {
            response.forEach(proposal => {
              let load_missing_stop_info = [];
              let transport_list = [];
              let formatted_table = [];
              proposal.stages.forEach(stage => {
                if (stage.transport_type_id === 0) {
                  transport_list.push(stage.transport_type_name);
                } else {
                  transport_list.push(string.format('%s %s', stage.transport_type_name, stage.line_name));
                }
                load_missing_stop_info.push(get_stop_info(stage.from_stop_id));
                load_missing_stop_info.push(get_stop_info(stage.to_stop_id));
              });
              Promise.all(load_missing_stop_info)
                .then(() => {
                  formatted_table.push(string.format('%s -> %s [ %s ] (%s)', format_time(proposal.departure_time), format_time(proposal.arrival_time), transport_list.join(' -> '), format_travel_time(proposal.travel_time)));
                  proposal.stages.forEach(stage => {
                    let travel_time = format_travel_time(stage.travel_time);
                    let departure_time = format_time(stage.departure_time);
                    let transport = '';
                    let [from, to] = [CACHED_STOPS[stage.from_stop_id], CACHED_STOPS[stage.to_stop_id]];
                    from = from ? 'fra ' + from.name : '';
                    to   = to   ? 'til ' + to.name   : '';
                    if (stage.transport_type_id === 0) {
                      transport = string.format('%s (%s)', stage.transport_type_name, travel_time);
                    } else {
                      transport = string.format('%s %s (%s)', stage.transport_type_name, stage.line_name, travel_time);
                    }
                    formatted_table.push(string.format('  %4s %15s %s %s', departure_time, transport, from, to));
                  });
                  return resolve(formatted_table);
                });
            });
          })
          .catch(error => {
            logger.debug(error);
            return reject(error);
          });
      })
      .catch(error => {
        logger.error(error);
        return reject(error);
      });
  });
}


function format_travel_time(travel_time) {
  let [hours, minutes, seconds] = travel_time.split(':').map((part) => {
    return parseInt(part);
  });
  let hr = (hours > 0) ? string.format('%dt', hours) : '';
  if (seconds > 30) {
    minutes += 1;
  }
  hr += string.format('%dm', minutes);
  return hr;
}

function format_time(date) {
  return moment(date).format('HH:mm');
}

export default {
  get_all_stops,
  get_stop_info,
  search_stops,
  travel_proposals,
  search_and_propose,
  get_travels_formatted
};

