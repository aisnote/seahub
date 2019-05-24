import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';

moment.locale(window.app.config.lang);


const itemPropTypes = {
  item: PropTypes.object.isRequired,
};

class Item extends Component {

  render() {
    let item = this.props.item;

    return(
      <Fragment>
        <tr>
          <td colSpan='5'>{item.name}</td>
        </tr>
        <tr>
          <td colSpan='5'><Button className="fa fa-plus"></Button>{gettext('Add a table')}</td>
        </tr>
      </Fragment>
    );
  }
}

Item.propTypes = itemPropTypes;


const contentPropTypes = {
  items: PropTypes.array.isRequired,
};

class Content extends Component {

  render() {
    let items = this.props.items;

    return ( 
      <table width="100%" className="table table-hover table-vcenter">
        <colgroup>
          <col width="5%"/>
          <col width="30%"/>
          <col width="30%"/>
          <col width="30%"/>
          <col width="5%"/>
        </colgroup>
        <tbody>
          {items.map((item, index) => {
            return (
              <Item
                key={index}
                item={item}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

Content.propTypes = contentPropTypes;


class DTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listWorkSpaces().then((res) => {
      this.setState({
        loading: false,
        items: res.data.workspace_list,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          loading: false,
          errorMsg: gettext('Error')
        });
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="starred">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('DTable')}</h3>
          </div>
          <div className="cur-view-content">
            {this.state.loading && <Loading />}
            {(!this.state.loading && this.state.errorMsg) && 
              <p className="error text-center">{this.state.errorMsg}</p>
            }
            {!this.state.loading &&
              <Fragment>
                <Content items={this.state.items}/><br />
                <div><Button className="fa fa-plus"></Button>{gettext('Add a workspace')}</div>
              </Fragment>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default DTable;
