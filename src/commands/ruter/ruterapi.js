import Promise from 'bluebird';

import rp from 'request-promise';
import moment from 'moment';

import string from '../../util/string';
import logger from '../../util/logging';

const API_URL = 'https://reisapi.ruter.no';

const TRANSPORT_TYPES = {
  0 : 'walk',
  1 : 'airport bus',
  2 : 'bus',
  3 : 'dummy',
  4 : 'airport train',
  5 : 'boat',
  6 : 'train',
  7 : 'tram',
  8 : 'metro'
};

let CACHED_STOPS = {};

export function get_stops() {
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
        let stops = [];
        // logger.debug(response);
        response.forEach(stop => {
          if (stop.PlaceType === 'Stop') {
            // logger.debug(stop.Lines);
            let lines = [
            ];
            stop.Lines.forEach(line => {
              lines.push({
                id : line.ID,
                name : line.Name,
                type : line.Transportation,
                type_name : TRANSPORT_TYPES[line.Transportation]
              });
            });
            stops.push({
              id : stop.ID,
              name : stop.Name,
              x : stop.X,
              y : stop.Y,
              lines : lines
            });
          }
        });
        return resolve(stops);
      })
      .catch(error => {
        return reject(error);
      });
  });

}

function search_and_travel(from, to, date) {
  let stops = [];
  stops.push(search_stops(from));
  stops.push(search_stops(to));
  return Promise.all(stops)
    .then(found_stops => {
      return travel_proposals(found_stops[0][0].id, found_stops[1][0].id, date);
    })
    .catch(error => {
      logger.debug(error);
      return [];
    });
}

function travel_proposals(from, to, date) {
  // http://reisapi.ruter.no/Help/Api/GET-Travel-GetTravels_fromPlace_toPlace_isafter_time_changemargin_changepunish_walkingfactor_proposals_transporttypes_maxwalkingminutes_linenames_walkreluctance_waitAtBeginningFactor

  return new Promise((resolve, reject) => {
    let time = date.format('DDMMYYYHHmmss');
    logger.debug(from, to, date, time);
    let options = {
      method: 'GET',
      uri: `${API_URL}/Travel/GetTravels/`,
      qs : {
        fromPlace : from,
        toPlace : to,
        isafter : true
        // time : time
      },
      headers : {
        'Content-type' : 'application/json'
      },
      json: true
      // resolveWithFullResponse : true
    };
    rp(options)
      .then(response => {
        // logger.debug(response);
        let proposals = [];
        if (response.TravelProposals) {
          response.TravelProposals.forEach(proposal => {
            let stages = [];
            logger.debug(proposal);

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
        // logger.debug(error);
        return reject(error);
      });
  });
}

export default {
  get_stops,
  search_stops,
  travel_proposals
};

// search_stops('Oslo S')
// // travel(rosenhoff, jernbanetorget, date)
//   .then(response => {
//     response.forEach(stop => {
//       // logger.debug(string.format('%10d %s (%10d, %10d) %s', stop.id, stop.name, stop.x, stop.y, stop.lines));
//       logger.debug(string.format('%7d %100s (%7d, %7d)', stop.id, stop.name, stop.x, stop.y));
//     });
//   })
//   .catch(error => {
//     logger.debug(error);
//   });
let date = moment();
get_stops()
  .then(() => {
    // search_and_travel('Rosenhoff', 'Oslo S', date)
    search_and_travel('Nydalen', 'Oslo S', date)
      .then(response => {
        response.forEach(proposal => {
          logger.debug(string.format('%s -> %s (%s)', proposal.departure_time, proposal.arrival_time, proposal.travel_time));
          proposal.stages.forEach(stage => {
            try {
              let from = CACHED_STOPS[stage.from_stop_id];
              let to   = CACHED_STOPS[stage.to_stop_id];
              from = from ? from.name : '';
              to = to ? to.name : '';
              logger.debug(string.format('\t%s %10s %3s from %s to %s', stage.travel_time, stage.transport_type_name, stage.line_name, from, to));
            } catch(error) {
              logger.error(error);
            }
          });
        });
      })
      .catch(error => {
        logger.debug(error);
      });
  })
  .catch(error => {
    logger.error(error);
  });

