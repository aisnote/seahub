# -*- coding: utf-8 -*-

import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from seaserv import seafile_api, edit_repo

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.dtable.models import WorkSpaces
from seahub.api2.utils import api_error
from seahub.utils import is_valid_dirent_name, is_org_context


logger = logging.getLogger(__name__)


class WorkSpacesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """get all workspaces
        """
        owner = request.user.username
        try:
            workspaces = WorkSpaces.objects.get_workspaces_by_owner(owner)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        workspace_list = []
        for workspace in workspaces:
            repo_id = workspace.repo_id
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                logger.warning('Library %s not found.' % repo_id)
                continue

            res = workspace.to_dict()
            res["updated_at"] = workspace.updated_at
            workspace_list.append(res)

        return Response({"workspace_list": workspace_list}, status=status.HTTP_200_OK)

    def post(self, request):
        """create a workspace
        """
        # argument check
        name = request.POST.get('name')
        if not name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_valid_dirent_name(name):
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not request.user.permissions.can_add_repo():
            error_msg = 'You do not have permission to create workspace.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        try:
            if org_id > 0:
                repo_id = seafile_api.create_org_repo(name, '', "dtable@seafile", org_id)
            else:
                repo_id = seafile_api.create_repo(name, '', "dtable@seafile")
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        owner = request.user.username
        try:
            workspace = WorkSpaces.objects.create_workspace(name, owner, repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"workspace": workspace.to_dict()}, status=status.HTTP_201_CREATED)


class WorkSpaceView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, workspace_id):
        """rename a workspace
        """
        # argument check
        workspace_name = request.data.get('name')
        if not workspace_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        workspace = WorkSpaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'WorkSpace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # repo status check
        repo_status = repo.status
        if repo_status != 0:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            edit_repo(repo_id, workspace_name, '', username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            workspace.name = workspace_name
            workspace.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"workspace": workspace.to_dict()}, status=status.HTTP_200_OK)

    def delete(self, request, workspace_id):
        """delete a workspace
        """
        # resource check
        workspace = WorkSpaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'WorkSpace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # repo status check
        repo_status = repo.status
        if repo_status != 0:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # remove repo
        try:
            seafile_api.remove_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            WorkSpaces.objects.delete_workspace(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": "true"}, status=status.HTTP_200_OK)
