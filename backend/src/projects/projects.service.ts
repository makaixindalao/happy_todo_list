import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { Project, Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) { }

  async create(userId: number, createProjectDto: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: {
        userId,
        name: createProjectDto.name,
      },
    });
  }

  async findAll(userId: number) {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 获取未完成任务数量
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const uncompletedTaskCount = await this.prisma.task.count({
          where: {
            projectId: project.id,
            status: 'PENDING',
          },
        });

        return {
          ...project,
          taskCount: project._count.tasks,
          uncompletedTaskCount,
        };
      })
    );

    return projectsWithCounts;
  }

  async findOne(id: number, userId: number): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const uncompletedTaskCount = await this.prisma.task.count({
      where: {
        projectId: project.id,
        status: 'PENDING',
      },
    });

    return {
      ...project,
      taskCount: project._count.tasks,
      uncompletedTaskCount,
    } as any;
  }

  async update(id: number, userId: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }



    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  async remove(id: number, userId: number): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }



    // 删除项目时，相关任务会因为外键约束自动删除
    return this.prisma.project.delete({
      where: { id },
    });
  }


}
