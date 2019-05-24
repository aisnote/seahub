import React from 'react';
import PropTypes from 'prop-types';
import TreeListView from './tree-list-view'

import TreeNode from '../../components/tree-view/tree-node';
import Dirent from '../../models/dirent';
import { seafileAPI } from '../../utils/seafile-api';
import treeHelper from '../../components/tree-view/tree-helper';
import { Utils } from '../../utils/utils';

const propTypes = {
  isShowFile: PropTypes.bool,
  selectedPath: PropTypes.string,
  selectedRepo: PropTypes.object,
  repo: PropTypes.object.isRequired,
  initToShowChildren: PropTypes.bool.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
  onRepoItemClick: PropTypes.func.isRequired,
  fileSuffixes: PropTypes.array,
};

class RepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowChildren: this.props.initToShowChildren,
      treeData: treeHelper.buildTree(),
    };
  }

  componentDidMount () {
    let repoID = this.props.repo.repo_id;
    seafileAPI.listDir(repoID, '/').then(res => {
      let tree = this.state.treeData.clone();
      let direntList = res.data.dirent_list.filter(item => item.type === 'dir')
      this.addResponseListToNode(direntList, tree.root);
      this.setState({treeData: tree})
    })

    if (this.props.repoObj) {
      if (this.props.repoObj.repoID === this.props.repo.repo_id) {
        this.setState({isShowChildren: true});
        this.loadNodeAndParentsByPath(this.props.repoObj.repoID, this.props.repoObj.filePath);
      }
    }
  }

  addResponseListToNode = (list, node) => {
    node.isLoaded = true;
    node.isExpanded = true;
    let direntList = list.map(item => {
      return new Dirent(item);
    });
    direntList = Utils.sortDirents(direntList, 'name', 'asc');

    let nodeList = direntList.map(object => {
      return new TreeNode({object});
    });
    node.addChildren(nodeList);
  }

  onNodeExpanded = (node) => {
    let repoID = this.props.repo.repo_id;
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        let direntList = res.data.dirent_list.filter(item => item.type === 'dir')
        this.addResponseListToNode(direntList, node);
        this.setState({treeData: tree});
      });
    } else {
      tree.expandNode(node);
      this.setState({treeData: tree});
    }
  }

  onNodeCollapse = (node) => {
    let tree = treeHelper.collapseNode(this.state.treeData, node);
    this.setState({treeData: tree});
  }

  loadNodeAndParentsByPath = (repoID, path) => {

    let tree = this.state.treeData.clone();
   
    seafileAPI.listDir(repoID, path, {with_parents: true}).then(res => {
      let direntList = res.data.dirent_list;
      direntList = direntList.filter(item => item.type === 'dir')
      let results = {};
      for (let i = 0; i < direntList.length; i++) {
        let object = direntList[i];
        let parentDir = object.parent_dir;
        let key = parentDir === '/' ?  '/' : parentDir.slice(0, parentDir.length - 1);
        if (!results[key]) {
          results[key] = [];
        }
        results[key].push(object);
      }
      for (let key in results) {
        let node = tree.getNodeByPath(key);
        if (!node.isLoaded) {
          this.addResponseListToNode(results[key], node);
        }
      }
      this.setState({
        treeData: tree
      });
    });
  }

  onToggleClick = () => {
    this.setState({isShowChildren: !this.state.isShowChildren});
  }

  onDirentItemClick = (filePath, dirent) => {
    let repo = this.props.repo;
    this.props.onDirentItemClick(repo, filePath, dirent);
  }

  onRepoItemClick = () => {
    if (!this.isCurrentRepo()) {
      this.props.onRepoItemClick(this.props.repo);
    } else {
      this.onToggleClick();
    }
  }

  isCurrentRepo = () => {
    let { selectedRepo, repo } = this.props;
    return selectedRepo && (repo.repo_id === selectedRepo.repo_id);
  }

  render() {
    let repoActive = false;
    let isCurrentRepo = this.isCurrentRepo();
    if (isCurrentRepo && !this.props.selectedPath) {
      repoActive = true;
    }

    return (
      <li className="file-chooser-item">
        <span className={`item-toggle fa ${this.state.isShowChildren ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
        <span className={`item-info ${repoActive ? 'item-active' : ''}`} onClick={this.onRepoItemClick}>
          <span className="icon far fa-folder"></span>
          <span className="name user-select-none ellipsis">{this.props.repo.repo_name}</span>
        </span>
        {this.state.isShowChildren && (
          <TreeListView 
            repo={this.props.repo} 
            onDirentItemClick={this.onDirentItemClick}
            selectedRepo={this.props.selectedRepo}
            selectedPath={this.props.selectedPath}
            fileSuffixes={this.props.fileSuffixes}
            treeData={this.state.treeData}
            onNodeCollapse={this.onNodeCollapse}
            onNodeExpanded={this.onNodeExpanded}
          />
        )}
      </li>
    );
  }
}

RepoListItem.propTypes = propTypes;

export default RepoListItem;
